import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { msg } from '../../../common/i18n/messages';
import { isScheduledOn } from '../../../recurrence/helpers/scheduled-slots';
import { ItemEntity } from '../../entities/item.entity';
import type { ItemView } from '../../types/item-view.types';
import { ItemOccurrencesService } from '../item-occurrences/item-occurrences.service';
import { ItemThreadsService } from '../item-threads/item-threads.service';
import { ItemViewsService } from '../item-views/item-views.service';
import { ItemsService } from '../items/items.service';

const OPEN = ['inbox', 'todo', 'doing', 'blocked'] as const;
/** A `doing` item untouched this long may be claimed again (the agent that took it is gone). */
const STALE_MS = 24 * 3600_000;

export type DeferAssignmentInput = { itemId: string; date?: string | null; dueAt?: string | null; note?: string };

/**
 * An agent's own to-dos: items whose `assignee` is the caller's agent. Every write here is self-scoped: the server
 * refuses an item assigned to anyone else (`forbidden:not-assigned`), so a hub may run these without a confirm card.
 */
@Injectable()
export class ItemAssignmentsService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _repo: Repository<ItemEntity>,
    private readonly _items: ItemsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _threads: ItemThreadsService,
    private readonly _views: ItemViewsService,
  ) {}

  /**
   * The caller agent's open items: doing first, then by day / due, then oldest. A periodic one (a regular connector
   * check) is listed only on a day it is scheduled and not yet done or skipped.
   */
  async mine(ctx: RequestCtx): Promise<ItemView[]> {
    const slug = this._agentOrThrow(ctx);
    const open = await this._repo.find({ where: { assignee: slug, status: In([...OPEN]) }, relations: { tags: true }, take: 100 });
    const today = localDateOf(ctx.now, ctx.timeZone);
    const periodic = open.filter((i) => i.recurrence);
    const handled = new Set((await this._occurrences.rowsBetween(periodic.map((i) => i.id), today, today)).filter((o) => o.date === today && (o.status || o.movedTo)).map((o) => o.itemId));
    const dueToday = (i: ItemEntity) => !!i.startsOn && today >= i.startsOn && (!i.endsOn || today <= i.endsOn) && isScheduledOn(i.recurrence!, i.startsOn, today) && !handled.has(i.id);
    const rows = open.filter((i) => !i.recurrence || dueToday(i));
    const rank = (i: ItemEntity) => (i.status === 'doing' ? 0 : 1);
    rows.sort((a, b) => rank(a) - rank(b) || (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.createdAt.getTime() - b.createdAt.getTime());
    return this._views.toViews(rows);
  }

  /** Field errors unless the caller is an agent and the item is assigned to it. */
  async checkOwn(itemId: string | undefined, ctx: RequestCtx): Promise<FieldError[]> {
    if (!ctx.agentSlug) return [{ path: 'itemId', code: 'forbidden:not-an-agent', message: msg(ctx.locale, 'forbidden:not-an-agent') }];
    if (!itemId) return [];
    const item = await this._repo.findOneBy({ id: itemId });
    if (!item) return [{ path: 'itemId', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }];
    if (item.assignee !== ctx.agentSlug) return [{ path: 'itemId', code: 'forbidden:not-assigned', message: msg(ctx.locale, 'forbidden:not-assigned') }];
    return [];
  }

  /** Marks one of mine `doing`; with no id, the oldest actionable todo (or a stale doing). Null when none is left. */
  async claim(itemId: string | undefined, ctx: RequestCtx): Promise<ItemView | null> {
    await this._throwIf(this.checkOwn(itemId, ctx));
    const slug = ctx.agentSlug!;
    let id = itemId;
    if (!id) {
      const candidates = await this._repo.find({
        where: [
          { assignee: slug, status: 'todo', type: 'task', recurrence: IsNull() },
          { assignee: slug, status: 'doing', type: 'task', recurrence: IsNull(), updatedAt: LessThan(new Date(Date.now() - STALE_MS)) },
        ],
        order: { createdAt: 'ASC' },
        take: 50,
      });
      const locked = await this._threads.lockedIds(candidates);
      id = candidates.find((c) => !locked.has(c.id))?.id;
      if (!id) return null;
    }
    await this._repo.update(id, { status: 'doing' });
    return this._views.one(id);
  }

  /**
   * Done. A single item: `result` is appended to the body. A periodic one (a regular check): only today's occurrence
   * closes and `result` goes on it, so the body keeps being the instructions.
   */
  async complete(itemId: string, result: string | undefined, ctx: RequestCtx): Promise<ItemView> {
    await this._throwIf(this.checkOwn(itemId, ctx));
    const item = await this._repo.findOneByOrFail({ id: itemId });
    if (item.recurrence) return this._occurrences.complete({ id: itemId }, ctx, result);
    if (result) await this._items.addNote(itemId, result);
    return this._occurrences.complete({ id: itemId }, ctx);
  }

  /**
   * Put off. A single item: back to `todo`, to another day / due moment when given; `note` is appended to the body.
   * A periodic one: only today's occurrence moves (to `date`) or is skipped (no date); the series stays.
   */
  async defer(input: DeferAssignmentInput, ctx: RequestCtx): Promise<ItemView> {
    await this._throwIf(this.checkOwn(input.itemId, ctx));
    const item = await this._repo.findOneByOrFail({ id: input.itemId });
    if (item.recurrence) {
      const today = localDateOf(ctx.now, ctx.timeZone);
      return input.date ? this._occurrences.move({ id: item.id, date: today, toDate: input.date }, ctx) : this._occurrences.skip({ id: item.id, date: today, note: input.note }, ctx);
    }
    if (input.note) await this._items.addNote(input.itemId, input.note);
    return this._items.update({ id: input.itemId, status: 'todo', ...(input.date !== undefined && { date: input.date }), ...(input.dueAt !== undefined && { dueAt: input.dueAt }) }, ctx);
  }

  private _agentOrThrow(ctx: RequestCtx): string {
    if (!ctx.agentSlug) throw AppException.forbidden('forbidden:not-an-agent', msg(ctx.locale, 'forbidden:not-an-agent'));
    return ctx.agentSlug;
  }

  private async _throwIf(errors: Promise<FieldError[]>): Promise<void> {
    const list = await errors;
    if (!list.length) return;
    if (list[0].code.startsWith('forbidden:')) throw new AppException(HttpStatus.FORBIDDEN, list[0].code, list[0].message, list);
    throw AppException.invalid(list);
  }
}
