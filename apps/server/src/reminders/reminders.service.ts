import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { AppException } from '../common/http/app-exception';
import type { FieldError } from '../common/http/error-codes';
import type { RequestCtx } from '../common/context/request-context';
import { msg } from '../common/i18n/messages';
import type { ReminderInput } from './dto/reminder-input.schema';
import { ReminderEntity } from './entities/reminder.entity';

export type ReminderOwner = { itemId: string } | { habitId: string };
export type ReminderView = { id: string; at: string | null; timeOfDay: string | null; offsetMin: number | null };

/** What an owner allows: single tasks take `at` / `offsetMin`; periodic tasks and habits take `timeOfDay`. */
export type ReminderOwnerShape = { periodic: boolean; hasDueAt: boolean };

/** A reminder's value, to match a row against an input. */
function reminderValueKey(r: Partial<Pick<ReminderEntity, 'at' | 'timeOfDay' | 'offsetMin'>>): string {
  if (r.at) return `at:${new Date(r.at).toISOString()}`;
  if (r.timeOfDay) return `time:${r.timeOfDay.slice(0, 5)}`;
  return `offset:${r.offsetMin ?? ''}`;
}

@Injectable()
export class RemindersService {
  constructor(@InjectRepository(ReminderEntity) private readonly _repo: Repository<ReminderEntity>) {}

  /** Field errors for a reminders list on an owner of the given shape. */
  check(list: ReminderInput[] | undefined, owner: ReminderOwnerShape, ctx: RequestCtx, path = 'reminders', keptAts: Set<string> = new Set()): FieldError[] {
    if (!list) return [];
    return list.flatMap((r, i): FieldError[] => {
      const p = `${path}.${i}`;
      if ('at' in r) {
        if (owner.periodic) return [{ path: `${p}.at`, code: 'invalid:args', message: 'A periodic task or habit takes timeOfDay reminders' }];
        if (new Date(r.at).getTime() <= ctx.now.getTime() && !keptAts.has(new Date(r.at).toISOString())) return [{ path: `${p}.at`, code: 'invalid:item:remind-at-past', message: msg(ctx.locale, 'invalid:item:remind-at-past') }];
      }
      if ('timeOfDay' in r && !owner.periodic) return [{ path: `${p}.timeOfDay`, code: 'invalid:args', message: 'A single task takes an absolute reminder (at)' }];
      if ('offsetMin' in r && (owner.periodic || !owner.hasDueAt)) return [{ path: `${p}.offsetMin`, code: 'invalid:args', message: 'offsetMin needs a single task with dueAt' }];
      return [];
    });
  }

  /**
   * Makes the owner's reminders equal the list, by value: rows already there are kept (with their `lastFiredAt`, so a
   * fired reminder does not fire again), missing ones are added, the rest removed.
   */
  async replaceForOwner(m: EntityManager, owner: ReminderOwner, list: ReminderInput[]): Promise<void> {
    const existing = await m.find(ReminderEntity, { where: owner, order: { createdAt: 'ASC' } });
    const left = [...existing];
    for (const r of list) {
      const cols = this._columns(r);
      const i = left.findIndex((row) => reminderValueKey(row) === reminderValueKey(cols));
      if (i >= 0) left.splice(i, 1);
      else await m.save(m.create(ReminderEntity, { ...owner, ...cols }));
    }
    if (left.length) await m.delete(ReminderEntity, { id: In(left.map((r) => r.id)) });
  }

  /** `at` values (ISO) the owner already has — unchanged ones are not re-checked for being in the past. */
  async existingAts(itemId: string): Promise<Set<string>> {
    const rows = await this._repo.find({ where: { itemId, at: Not(IsNull()) } });
    return new Set(rows.map((r) => (r.at as Date).toISOString()));
  }

  /** The item's due time moved: its `offsetMin` reminders may fire again. */
  async resetOffsetFirings(m: EntityManager, itemId: string): Promise<void> {
    await m.update(ReminderEntity, { itemId, offsetMin: Not(IsNull()) }, { lastFiredAt: null });
  }

  /** An item's current reminders as inputs (to append one without losing the rest). */
  async inputsOf(m: EntityManager, itemId: string): Promise<ReminderInput[]> {
    const rows = await m.find(ReminderEntity, { where: { itemId }, order: { createdAt: 'ASC' } });
    return rows.map((r): ReminderInput => (r.at ? { at: r.at.toISOString() } : r.timeOfDay ? { timeOfDay: r.timeOfDay.slice(0, 5) } : { offsetMin: r.offsetMin ?? 0 }));
  }

  async create(owner: ReminderOwner, input: ReminderInput): Promise<ReminderEntity> {
    return this._repo.save(this._repo.create({ ...owner, ...this._columns(input) }));
  }

  async delete(id: string): Promise<void> {
    const res = await this._repo.delete({ id });
    if (!res.affected) throw AppException.notFound('not-found:reminder');
  }

  async viewsByOwner(key: 'itemId' | 'habitId', ids: string[]): Promise<Map<string, ReminderView[]>> {
    const out = new Map<string, ReminderView[]>();
    if (!ids.length) return out;
    const rows = await this._repo.find({ where: { [key]: In(ids) }, order: { createdAt: 'ASC' } });
    for (const r of rows) {
      const ownerId = r[key] as string;
      out.set(ownerId, [...(out.get(ownerId) ?? []), { id: r.id, at: r.at?.toISOString() ?? null, timeOfDay: r.timeOfDay?.slice(0, 5) ?? null, offsetMin: r.offsetMin }]);
    }
    return out;
  }

  /** Unfired one-off reminders of items due by `now`: `at`, or `offsetMin` before the item's `dueAt`. */
  async findDueOneOff(now: Date): Promise<{ id: string; itemId: string; dueAt: Date }[]> {
    const rows: { id: string; item_id: string; due: Date }[] = await this._repo.query(
      `select r.id, r.item_id, coalesce(r.at, i.due_at - make_interval(mins => r.offset_min)) as due
         from reminders r join items i on i.id = r.item_id
        where r.last_fired_at is null and r.time_of_day is null
          and coalesce(r.at, i.due_at - make_interval(mins => r.offset_min)) <= $1`,
      [now],
    );
    return rows.map((r) => ({ id: r.id, itemId: r.item_id, dueAt: new Date(r.due) }));
  }

  /** Daily (`timeOfDay`) reminders not fired since `since` (the owner's local midnight). */
  findDailyNotFiredSince(since: Date): Promise<ReminderEntity[]> {
    return this._repo.find({ where: [{ timeOfDay: Not(IsNull()), lastFiredAt: IsNull() }, { timeOfDay: Not(IsNull()), lastFiredAt: LessThan(since) }] });
  }

  /** Claims a reminder for firing (once): sets `lastFiredAt` only if it was not fired since `since`; false = already fired. */
  async claimFiring(id: string, now: Date, since: Date | null): Promise<boolean> {
    const qb = this._repo.createQueryBuilder().update().set({ lastFiredAt: now }).where('id = :id', { id });
    qb.andWhere(since ? '(last_fired_at is null or last_fired_at < :since)' : 'last_fired_at is null', since ? { since } : {});
    return ((await qb.execute()).affected ?? 0) > 0;
  }

  private _columns(r: ReminderInput): Partial<ReminderEntity> {
    if ('at' in r) return { at: new Date(r.at) };
    if ('timeOfDay' in r) return { timeOfDay: r.timeOfDay };
    return { offsetMin: r.offsetMin };
  }
}
