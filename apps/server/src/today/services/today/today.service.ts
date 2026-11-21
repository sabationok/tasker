import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Or, Repository } from 'typeorm';
import { CategoriesService } from '../../../categories/categories.service';
import { ChecklistService } from '../../../checklist/checklist.service';
import type { RequestCtx } from '../../../common/context/request-context';
import { AppException } from '../../../common/http/app-exception';
import { eachLocalDate, localDateOf } from '../../../common/helpers/local-date';
import { HabitEntity } from '../../../habits/entities/habit.entity';
import { HabitCheckinsService } from '../../../habits/services/habit-checkins';
import { HabitsService } from '../../../habits/services/habits';
import { ItemEntity } from '../../../items/entities/item.entity';
import { ItemOccurrencesService } from '../../../items/services/item-occurrences';
import { ItemThreadsService } from '../../../items/services/item-threads';
import type { CategoryRef } from '../../../items/types/item-view.types';
import { periodOf } from '../../../recurrence/helpers/period-of';
import { scheduledSlots } from '../../../recurrence/helpers/scheduled-slots';
import type { Recurrence } from '../../../recurrence/recurrence.schema';
import { SettingsService } from '../../../settings/settings.service';
import type { TodayEntry, TodayFilter, TodayView } from '../../types/today.types';

type Done = { date: string; done: boolean };

/** Today and the day strip: single tasks, pending tasks, actionable threads, periodic occurrences and habits of a day. */
@Injectable()
export class TodayService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    private readonly _categories: CategoriesService,
    private readonly _checklist: ChecklistService,
    private readonly _threads: ItemThreadsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _habits: HabitsService,
    private readonly _checkins: HabitCheckinsService,
    private readonly _settings: SettingsService,
  ) {}

  async get(date: string | undefined, ctx: RequestCtx, filter: TodayFilter = {}): Promise<TodayView> {
    const { categoryId, assignee } = filter;
    const day = date ?? localDateOf(ctx.now, ctx.timeZone);
    const all = (await this.entriesBetween(day, day, ctx)).get(day) ?? [];
    const entries = assignee ? all.filter((e) => e.assignee === assignee) : all;
    const cats = await this._categories.findMany();
    const counts = new Map<string, number>();
    for (const e of entries) if (e.category) counts.set(e.category.id, (counts.get(e.category.id) ?? 0) + 1);
    const shown = categoryId ? entries.filter((e) => e.category?.id === categoryId) : entries;
    return {
      date: day,
      progress: this._progress(shown),
      categories: cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, count: counts.get(c.id) ?? 0 })),
      completed: shown.filter((e) => e.done).length,
      entries: shown,
    };
  }

  async strip(from: string, to: string, ctx: RequestCtx): Promise<{ date: string; done: number; total: number; percent: number }[]> {
    if (to < from || eachLocalDate(from, to).length > 62) throw AppException.invalid([{ path: 'to', code: 'invalid:args', message: 'Give from ≤ to, at most 62 days' }]);
    const byDay = await this.entriesBetween(from, to, ctx);
    return eachLocalDate(from, to).map((date) => ({ date, ...this._progress(byDay.get(date) ?? []) }));
  }

  /** Entries per day for a range, built with one batch of queries. */
  async entriesBetween(from: string, to: string, ctx: RequestCtx): Promise<Map<string, TodayEntry[]>> {
    const days = eachLocalDate(from, to);
    const out = new Map<string, TodayEntry[]>(days.map((d) => [d, []]));
    const cats = new Map<string, CategoryRef>((await this._categories.findMany(true)).map((c) => [c.id, { id: c.id, name: c.name, icon: c.icon, color: c.color }]));
    const cat = (id: string | null) => (id ? (cats.get(id) ?? null) : null);
    const { weekStart } = await this._settings.get();
    const wide = { from: periodOf(from, 'month', weekStart).from < periodOf(from, 'week', weekStart).from ? periodOf(from, 'month', weekStart).from : periodOf(from, 'week', weekStart).from, to: periodOf(to, 'month').to > periodOf(to, 'week', weekStart).to ? periodOf(to, 'month').to : periodOf(to, 'week', weekStart).to };

    // single tasks (incl. threads and pending)
    const singles = await this._items.find({
      where: [
        { type: 'task', recurrence: IsNull(), date: And(MoreThanOrEqual(from), LessThanOrEqual(to)), status: Not('archived') },
        { type: 'task', recurrence: IsNull(), pending: true, date: LessThanOrEqual(to), status: Not('archived') },
      ],
    });
    const locked = await this._threads.lockedIds(singles);
    const threadCounts = await this._threads.counts(singles.map((s) => s.id));
    const lines = await this._checklist.linesByItem(singles.map((s) => s.id));
    for (const it of singles) {
      if (locked.has(it.id) || !it.date) continue;
      const doneDay = it.doneAt ? localDateOf(it.doneAt, ctx.timeZone) : null;
      for (const d of days) {
        const isDay = it.date === d;
        const pendingDay = it.pending && it.date < d && (it.status !== 'done' || (doneDay !== null && doneDay >= d));
        if (!isDay && !pendingDay) continue;
        const done = it.status === 'done' && (!it.pending || doneDay === null || doneDay <= d);
        const l = lines.get(it.id) ?? [];
        out.get(d)?.push({
          source: 'task', key: it.id, itemId: it.id, shortId: it.shortId, date: d, title: it.title, type: 'task', category: cat(it.categoryId), assignee: it.assignee, priority: it.priority,
          ...(l.length && { checklist: { done: l.filter((x) => x.doneAt).length, total: l.length } }),
          ...(threadCounts.get(it.id) && { threads: threadCounts.get(it.id) }),
          done, ...(done && { status: 'done' as const }), ...(pendingDay && !done && { late: true }),
        });
      }
    }

    // periodic tasks
    const periodic = await this._items.find({ where: { type: 'task', recurrence: Not(IsNull()), startsOn: LessThanOrEqual(to), endsOn: Or(IsNull(), MoreThanOrEqual(wide.from)), status: Not('archived') } });
    const occ = await this._occurrences.rowsBetween(periodic.map((p) => p.id), wide.from, wide.to);
    const pLines = await this._checklist.linesByItem(periodic.map((p) => p.id));
    for (const it of periodic) {
      const rows = occ.filter((o) => o.itemId === it.id);
      const rowAt = (date: string, slot: number) => rows.find((o) => o.date === date && o.slot === slot);
      const l = pLines.get(it.id) ?? [];
      const push = (d: string, slot: number, row = rowAt(d, slot), occurrenceDate = d) => {
        const ticked = row ? l.filter((x) => row.checklistDone.includes(x.id)).length : 0;
        out.get(d)?.push({
          source: 'occurrence', key: `${it.id}:${occurrenceDate}:${slot}`, itemId: it.id, shortId: it.shortId, date: d, ...(occurrenceDate !== d && { occurrenceDate }), ...(it.recurrence?.freq === 'hourly' && { slot }), title: it.title, type: 'task', category: cat(it.categoryId), assignee: it.assignee, priority: it.priority,
          ...(l.length && { checklist: { done: ticked, total: l.length } }),
          done: row?.status === 'done', ...(row?.status && { status: row.status }),
        });
      };
      const flexible = this._flexibleVisible(it.recurrence as Recurrence, rows.map((r) => ({ date: r.date, done: r.status === 'done' })), weekStart);
      for (const s of scheduledSlots(it.recurrence as Recurrence, it.startsOn as string, it.endsOn, from, to)) {
        const row = rowAt(s.date, s.slot);
        if (row?.movedTo) continue;
        if (flexible && !flexible(s.date, row?.status === 'done')) continue;
        push(s.date, s.slot, row);
      }
      for (const r of rows) if (r.movedTo && r.movedTo >= from && r.movedTo <= to) push(r.movedTo, r.slot, r, r.date);
    }

    // habits
    const habits = (await this._habits.findActive()).filter((h) => h.startsOn <= to && (!h.endsOn || h.endsOn >= from));
    const checkins = await this._checkins.rowsBetween(habits.map((h) => h.id), wide.from, wide.to);
    const hLines = await this._habits.linesByHabit(habits.map((h) => h.id));
    for (const h of habits) {
      const rows = checkins.filter((c) => c.habitId === h.id);
      const flexible = this._flexibleVisible(h.recurrence, rows.map((r) => ({ date: r.date, done: r.status === 'done' })), weekStart);
      const total = hLines.get(h.id)?.length ?? 0;
      for (const s of scheduledSlots(h.recurrence, h.startsOn, h.endsOn, from, to)) {
        const row = rows.find((r) => r.date === s.date && r.slot === s.slot);
        if (flexible && !flexible(s.date, row?.status === 'done')) continue;
        out.get(s.date)?.push(this._habitEntry(h, s.date, s.slot, row ?? null, total, cat(h.categoryId)));
      }
    }
    return out;
  }

  private _habitEntry(h: HabitEntity, date: string, slot: number, row: { status: 'done' | 'skipped' | 'failed' | null; value: number | null; checklistDone: string[] } | null, total: number, category: CategoryRef | null): TodayEntry {
    return {
      source: 'habit', key: `${h.id}:${date}:${slot}`, habitId: h.id, shortId: h.shortId, date, ...(h.recurrence.freq === 'hourly' && { slot }), title: h.name, type: 'habit', category, assignee: 'me', priority: h.priority,
      ...(h.evaluation === 'checklist' && { checklist: { done: row?.checklistDone.length ?? 0, total } }),
      habit: { evaluation: h.evaluation, value: row?.value ?? null, target: h.targetValue, unit: h.unit },
      done: row?.status === 'done', ...(row?.status && { status: row.status }),
    };
  }

  /** For `days_per_period`: a day is shown until `count` days of its period are done (a done day always shows). */
  private _flexibleVisible(rule: Recurrence, rows: Done[], weekStart: 1 | 7): ((date: string, doneThatDay: boolean) => boolean) | null {
    if (rule.freq !== 'days_per_period') return null;
    return (date, doneThatDay) => {
      if (doneThatDay) return true;
      const p = periodOf(date, rule.period, weekStart);
      return rows.filter((r) => r.done && r.date >= p.from && r.date <= p.to).length < rule.count;
    };
  }

  private _progress(entries: TodayEntry[]): { done: number; total: number; percent: number } {
    const counted = entries.filter((e) => e.status !== 'skipped');
    const done = counted.filter((e) => e.done).length;
    return { done, total: counted.length, percent: counted.length ? Math.round((done / counted.length) * 100) : 0 };
  }
}
