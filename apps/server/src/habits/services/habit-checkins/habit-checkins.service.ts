import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import type { FieldError } from '../../../common/http/error-codes';
import { localDateOf } from '../../../common/helpers/local-date';
import { msg } from '../../../common/i18n/messages';
import { hourlySlots, isScheduledOn } from '../../../recurrence/helpers/scheduled-slots';
import type { CheckInInput } from '../../dto/habit.schemas';
import { HabitCheckinEntity } from '../../entities/habit-checkin.entity';
import { HabitEntity } from '../../entities/habit.entity';
import { checkinStatus } from '../../helpers/checkin-status';
import type { CheckinView } from '../../types/habit-view.types';
import { HabitsService } from '../habits';

@Injectable()
export class HabitCheckinsService {
  constructor(
    @InjectRepository(HabitCheckinEntity) private readonly _repo: Repository<HabitCheckinEntity>,
    @InjectDataSource() private readonly _ds: DataSource,
    private readonly _habits: HabitsService,
  ) {}

  async check(input: CheckInInput, ctx: RequestCtx): Promise<FieldError[]> {
    const L = ctx.locale;
    const habit = await this._habits.getOrFail(input.habitId).catch(() => null);
    if (!habit) return [{ path: 'habitId', code: 'not-found:habit', message: msg(L, 'not-found:habit') }];
    const date = input.date ?? localDateOf(ctx.now, ctx.timeZone);
    const errors: FieldError[] = [];
    const scheduled = date >= habit.startsOn && (!habit.endsOn || date <= habit.endsOn) && isScheduledOn(habit.recurrence, habit.startsOn, date);
    if (!scheduled) errors.push({ path: 'date', code: 'invalid:habit:date', message: msg(L, 'invalid:habit:date') });
    if (habit.recurrence.freq === 'hourly' && !hourlySlots(habit.recurrence).includes(input.slot ?? -1)) errors.push({ path: 'slot', code: 'invalid:args', message: 'Give a scheduled hour', expected: hourlySlots(habit.recurrence) });
    if (input.note && !habit.notesEnabled) errors.push({ path: 'note', code: 'invalid:habit:notes-disabled', message: msg(L, 'invalid:habit:notes-disabled') });
    if (input.checklistDone?.length) {
      const lines = new Set(((await this._habits.linesByHabit([habit.id])).get(habit.id) ?? []).map((l) => l.id));
      input.checklistDone.forEach((id, i) => !lines.has(id) && errors.push({ path: `checklistDone.${i}`, code: 'not-found:checklist-item', message: msg(L, 'not-found:checklist-item') }));
    }
    if (!input.status && input.value === undefined && !input.checklistDone && habit.evaluation !== 'yes_no') errors.push({ path: 'value', code: 'invalid:args', message: 'Give a value, the ticked sub-items or a status' });
    return errors;
  }

  /** Upserts a day's result; stopwatch values add up; an explicit status wins, else the status follows the target. */
  async checkIn(input: CheckInInput, ctx: RequestCtx): Promise<CheckinView | null> {
    const errors = await this.check(input, ctx);
    if (errors.length) throw AppException.invalid(errors);
    const habit = await this._habits.getOrFail(input.habitId);
    const date = input.date ?? localDateOf(ctx.now, ctx.timeZone);
    const slot = input.slot ?? 0;
    return this._ds.transaction(async (m) => {
      const row = await m.findOne(HabitCheckinEntity, { where: { habitId: habit.id, date, slot }, lock: { mode: 'pessimistic_write' } });
      if (input.status === 'none') {
        if (row) await m.delete(HabitCheckinEntity, { id: row.id });
        return null;
      }
      const value = input.value === undefined ? (row?.value ?? null) : habit.evaluation === 'stopwatch' ? (row?.value ?? 0) + input.value : input.value;
      const checklistDone = input.checklistDone ?? row?.checklistDone ?? [];
      const total = habit.evaluation === 'checklist' ? ((await this._habits.linesByHabit([habit.id])).get(habit.id)?.length ?? 0) : 0;
      const status = input.status ?? checkinStatus(habit, { value, checklistDone }, total);
      const patch = { value, checklistDone, status, ...(input.note !== undefined && { note: input.note }) };
      const saved = row ? await m.save(Object.assign(row, patch)) : await m.save(m.create(HabitCheckinEntity, { habitId: habit.id, date, slot, ...patch }));
      return this._view(saved);
    });
  }

  async findMany(habitId: string, from: string, to: string): Promise<CheckinView[]> {
    await this._habits.getOrFail(habitId, true);
    return (await this._repo.find({ where: { habitId, date: Between(from, to) }, order: { date: 'ASC', slot: 'ASC' } })).map((r) => this._view(r));
  }

  rowsBetween(habitIds: string[], from: string, to: string): Promise<HabitCheckinEntity[]> {
    return habitIds.length ? this._repo.find({ where: { habitId: In(habitIds), date: Between(from, to) } }) : Promise.resolve([]);
  }

  private _view(r: HabitCheckinEntity): CheckinView {
    return { id: r.id, date: r.date, slot: r.slot, status: r.status, value: r.value, checklistDone: r.checklistDone, note: r.note };
  }
}

