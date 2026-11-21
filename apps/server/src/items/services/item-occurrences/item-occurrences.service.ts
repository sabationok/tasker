import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, In, Repository } from 'typeorm';
import { ChecklistItemEntity } from '../../../checklist/entities/checklist-item.entity';
import { ChecklistService } from '../../../checklist/checklist.service';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { msg } from '../../../common/i18n/messages';
import { isScheduledOn } from '../../../recurrence/helpers/scheduled-slots';
import { hourlySlots } from '../../../recurrence/helpers/scheduled-slots';
import type { CompleteItemInput, MoveOccurrenceInput, SkipOccurrenceInput } from '../../dto/item.schemas';
import { ItemOccurrenceEntity } from '../../entities/item-occurrence.entity';
import { ItemEntity } from '../../entities/item.entity';
import type { ItemView } from '../../types/item-view.types';
import { ItemThreadsService } from '../item-threads/item-threads.service';
import { ItemViewsService } from '../item-views/item-views.service';

export type OccurrenceTarget = { item: ItemEntity; date: string; slot: number };

/** Done / undone / skipped / moved for single tasks and for one slot of a periodic task. */
@Injectable()
export class ItemOccurrencesService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    @InjectRepository(ItemOccurrenceEntity) private readonly _occ: Repository<ItemOccurrenceEntity>,
    @InjectDataSource() private readonly _ds: DataSource,
    private readonly _threads: ItemThreadsService,
    private readonly _views: ItemViewsService,
    private readonly _checklist: ChecklistService,
  ) {}

  /** Field errors for completing / skipping an item (locked thread, a day the periodic task is not scheduled, …). */
  async check(input: CompleteItemInput, ctx: RequestCtx, requirePeriodic = false): Promise<FieldError[]> {
    const item = await this._items.findOneBy({ id: input.id });
    if (!item) return [{ path: 'id', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }];
    if (item.type !== 'task') return [{ path: 'id', code: 'invalid:item:type-unsupported', message: msg(ctx.locale, 'invalid:item:type-unsupported') }];
    if (!item.recurrence) {
      if (requirePeriodic) return [{ path: 'id', code: 'invalid:args', message: 'Only a periodic task has occurrences' }];
      if (await this._threads.isLocked(item)) return [{ path: 'id', code: 'invalid:item:thread-locked', message: msg(ctx.locale, 'invalid:item:thread-locked') }];
      return [];
    }
    const t = this._target(item, input, ctx);
    return this._checkScheduled(t, ctx);
  }

  /** `note` (a periodic task only): kept on that day's occurrence, e.g. what an agent's regular check found. */
  async complete(input: CompleteItemInput, ctx: RequestCtx, note?: string): Promise<ItemView> {
    await this._throwIf(this.check(input, ctx));
    const item = await this._items.findOneByOrFail({ id: input.id });
    await this._ds.transaction(async (m) => {
      if (item.recurrence) return this._upsert(m, this._target(item, input, ctx), { status: 'done', doneAt: new Date(), ...(note && { note }) });
      const children = (await this._threads.childrenOf([item.id], m)).get(item.id) ?? [];
      const open = children.filter((c) => c.status !== 'done');
      if (open.length) await m.update(ItemEntity, { id: In(open.map((c) => c.id)) }, { status: 'done', doneAt: new Date() });
      await m.update(ItemEntity, { id: item.id }, { status: 'done', doneAt: item.doneAt ?? new Date() });
      if (item.parentId) await this._threads.afterChildChange(m, item.parentId);
    });
    return this._views.one(item.id);
  }

  async uncomplete(input: CompleteItemInput, ctx: RequestCtx): Promise<ItemView> {
    const item = await this._items.findOneBy({ id: input.id });
    if (!item) throw AppException.notFound('not-found:item');
    await this._ds.transaction(async (m) => {
      if (item.recurrence) return this._upsert(m, this._target(item, input, ctx), { status: null, doneAt: null });
      await m.update(ItemEntity, { id: item.id }, { status: 'todo', doneAt: null });
      if (item.parentId) await this._threads.afterChildChange(m, item.parentId);
    });
    return this._views.one(item.id);
  }

  async skip(input: SkipOccurrenceInput, ctx: RequestCtx): Promise<ItemView> {
    await this._throwIf(this.check(input, ctx, true));
    const item = await this._items.findOneByOrFail({ id: input.id });
    await this._ds.transaction((m) => this._upsert(m, this._target(item, input, ctx), { status: 'skipped', doneAt: null, ...(input.note && { note: input.note }) }));
    return this._views.one(item.id);
  }

  async checkMove(input: MoveOccurrenceInput, ctx: RequestCtx): Promise<FieldError[]> {
    const errors = await this.check(input, ctx, true);
    if (!errors.length && input.toDate === input.date) errors.push({ path: 'toDate', code: 'invalid:args', message: 'The new day is the same day' });
    return errors;
  }

  /** Moves one occurrence to another day: the row stays on the old day with `movedTo`. */
  async move(input: MoveOccurrenceInput, ctx: RequestCtx): Promise<ItemView> {
    await this._throwIf(this.checkMove(input, ctx));
    const item = await this._items.findOneByOrFail({ id: input.id });
    await this._ds.transaction((m) => this._upsert(m, this._target(item, input, ctx), { movedTo: input.toDate }));
    return this._views.one(item.id);
  }

  /** Ticks / unticks a checklist line; for a periodic task on a day (default today). A checklist-evaluated slot closes when all lines are ticked. */
  async toggleChecklistLine(lineId: string, ctx: RequestCtx, date?: string, slot?: number): Promise<ItemView> {
    const line = await this._checklist.getOrFail(lineId);
    const item = await this._items.findOneBy({ id: line.itemId });
    if (!item) throw AppException.notFound('not-found:item');
    if (!item.recurrence) {
      await this._checklist.toggleLine(line);
      return this._views.one(item.id);
    }
    const t = this._target(item, { date, slot }, ctx);
    await this._throwIf(Promise.resolve(this._checkScheduled(t, ctx)));
    await this._ds.transaction(async (m) => {
      const row = await m.findOneBy(ItemOccurrenceEntity, { itemId: item.id, date: t.date, slot: t.slot });
      const ticked = new Set(row?.checklistDone ?? []);
      if (ticked.has(lineId)) ticked.delete(lineId);
      else ticked.add(lineId);
      const patch: Partial<ItemOccurrenceEntity> = { checklistDone: [...ticked] };
      if (item.evaluation === 'checklist') {
        const total = await m.count(ChecklistItemEntity, { where: { itemId: item.id } });
        const allDone = total > 0 && ticked.size >= total;
        if (allDone) Object.assign(patch, { status: 'done', doneAt: new Date() });
        else if (row?.status === 'done') Object.assign(patch, { status: null, doneAt: null });
      }
      await this._upsert(m, t, patch);
    });
    return this._views.one(item.id);
  }

  /** Occurrence rows of items between two days (by scheduled day or by the day they were moved to). */
  async rowsBetween(itemIds: string[], from: string, to: string): Promise<ItemOccurrenceEntity[]> {
    if (!itemIds.length) return [];
    return this._occ.find({ where: [{ itemId: In(itemIds), date: Between(from, to) }, { itemId: In(itemIds), movedTo: Between(from, to) }] });
  }

  private _target(item: ItemEntity, input: { date?: string; slot?: number }, ctx: RequestCtx): OccurrenceTarget {
    return { item, date: input.date ?? localDateOf(ctx.now, ctx.timeZone), slot: input.slot ?? 0 };
  }

  private _checkScheduled({ item, date, slot }: OccurrenceTarget, ctx: RequestCtx): FieldError[] {
    const rule = item.recurrence;
    if (!rule) return [];
    const out = !item.startsOn || date < item.startsOn || (item.endsOn && date > item.endsOn) || !isScheduledOn(rule, item.startsOn, date);
    if (out) return [{ path: 'date', code: 'invalid:args', message: ctx.locale === 'uk' ? 'Цього дня задача не запланована' : 'The task is not scheduled on that day' }];
    if (rule.freq === 'hourly' && !hourlySlots(rule).includes(slot)) return [{ path: 'slot', code: 'invalid:args', message: 'Not a scheduled hour', expected: hourlySlots(rule) }];
    return [];
  }

  private async _upsert(m: EntityManager, { item, date, slot }: OccurrenceTarget, patch: Partial<ItemOccurrenceEntity>): Promise<void> {
    const row = await m.findOne(ItemOccurrenceEntity, { where: { itemId: item.id, date, slot }, lock: { mode: 'pessimistic_write' } });
    if (row) await m.update(ItemOccurrenceEntity, { id: row.id }, patch);
    else await m.save(m.create(ItemOccurrenceEntity, { itemId: item.id, date, slot, ...patch }));
    await m.update(ItemEntity, { id: item.id }, { updatedAt: new Date() });
  }

  private async _throwIf(errors: Promise<FieldError[]>): Promise<void> {
    const list = await errors;
    if (list.length) throw AppException.invalid(list);
  }
}
