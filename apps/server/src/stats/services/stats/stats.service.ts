import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format, parseISO } from 'date-fns';
import { And, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import type { RequestCtx } from '../../../common/context/request-context';
import { eachLocalDate, localDateOf } from '../../../common/helpers/local-date';
import { HabitCheckinsService } from '../../../habits/services/habit-checkins';
import { HabitsService } from '../../../habits/services/habits';
import type { GoalWindow } from '../../../habits/types/habit.types';
import { ItemEntity } from '../../../items/entities/item.entity';
import { ItemOccurrencesService } from '../../../items/services/item-occurrences';
import { periodOf } from '../../../recurrence/helpers/period-of';
import type { Recurrence } from '../../../recurrence/recurrence.schema';
import { SettingsService } from '../../../settings/settings.service';
import type { StatsPeriod, StatsScope, StatsView, Tally } from '../../types/stats.types';
import { countUnits, type Unit } from './helpers/count-units';

const empty = (): Tally => ({ completed: 0, skipped: 0, failed: 0 });
const rate = (t: Tally): number | null => (t.completed + t.failed ? Math.round((t.completed / (t.completed + t.failed)) * 1000) / 1000 : null);
const add = (t: Tally, u: Unit): void => void (t[u.result] += 1);

/** Success rate, completed / skipped / failed, per habit, per day and over time (spec §6.6, §11.1). */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(ItemEntity) private readonly _items: Repository<ItemEntity>,
    private readonly _habits: HabitsService,
    private readonly _checkins: HabitCheckinsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _settings: SettingsService,
  ) {}

  async get(q: { period: StatsPeriod; anchor?: string; scope: StatsScope }, ctx: RequestCtx): Promise<StatsView> {
    const { failedMode, weekStart } = await this._settings.get();
    const today = localDateOf(ctx.now, ctx.timeZone);
    const anchor = q.anchor ?? today;
    const habits = q.scope === 'tasks' ? [] : await this._habits.findAllForStats();
    const periodic = q.scope === 'habits' ? [] : await this._items.find({ where: { type: 'task', recurrence: Not(IsNull()) } });
    const range = await this._range(q.period, anchor, today, weekStart, [...habits.map((h) => h.startsOn), ...periodic.map((p) => p.startsOn as string)]);
    const wideFrom = periodOf(range.from, 'month').from < periodOf(range.from, 'week', weekStart).from ? periodOf(range.from, 'month').from : periodOf(range.from, 'week', weekStart).from;

    const units: Unit[] = [];
    const perHabit: StatsView['habits'] = [];
    const checkins = await this._checkins.rowsBetween(habits.map((h) => h.id), wideFrom, range.to);
    for (const h of habits) {
      const rows = checkins.filter((c) => c.habitId === h.id);
      const u = countUnits({ recurrence: h.recurrence, startsOn: h.startsOn, endsOn: h.endsOn ?? (h.archivedAt ? localDateOf(h.archivedAt, ctx.timeZone) : null) }, rows, range.from, range.to, today, failedMode, weekStart);
      units.push(...u);
      const t = empty();
      u.forEach((x) => add(t, x));
      perHabit.push({ id: h.id, name: h.name, score: rate(t), goals: await this._goals(h, anchor, weekStart) });
    }
    const occ = await this._occurrences.rowsBetween(periodic.map((p) => p.id), wideFrom, range.to);
    for (const p of periodic) {
      const rows = occ.filter((o) => o.itemId === p.id);
      // an archived periodic task stops counting from its archive day (items keep no archivedAt: the last update stands in)
      const archivedOn = p.status === 'archived' ? localDateOf(p.updatedAt, ctx.timeZone) : null;
      const endsOn = archivedOn && (!p.endsOn || archivedOn < p.endsOn) ? archivedOn : p.endsOn;
      units.push(...countUnits({ recurrence: p.recurrence as Recurrence, startsOn: p.startsOn as string, endsOn }, rows, range.from, range.to, today, failedMode, weekStart));
    }
    if (q.scope !== 'habits') {
      const singles = await this._items.find({ where: { type: 'task', recurrence: IsNull(), status: Not('archived'), date: And(MoreThanOrEqual(range.from), LessThanOrEqual(range.to)) } });
      for (const s of singles) {
        if (s.status === 'done') units.push({ date: s.date as string, result: 'completed' });
        else if (failedMode === 'missed' && (s.date as string) < today) units.push({ date: s.date as string, result: 'failed' });
      }
    }

    const summary = empty();
    units.forEach((u) => add(summary, u));
    const total = summary.completed + summary.failed + summary.skipped;
    const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    const monthly = eachLocalDate(range.from, range.to).length > 92;
    const bucketOf = (d: string) => (monthly ? d.slice(0, 7) : d);
    const buckets = [...new Set(eachLocalDate(range.from, range.to).map(bucketOf))];
    const byBucket = new Map(buckets.map((b) => [b, empty()]));
    units.forEach((u) => byBucket.get(bucketOf(u.date)) && add(byBucket.get(bucketOf(u.date)) as Tally, u));
    return {
      period: { type: q.period, ...range },
      summary: { successRate: rate(summary), ...summary },
      habits: perHabit.filter((h) => habits.find((x) => x.id === h.id)?.status === 'active' || h.score !== null),
      distribution: { completed: pct(summary.completed), failed: pct(summary.failed), skipped: pct(summary.skipped) },
      byDay: buckets.map((date) => ({ date, ...(byBucket.get(date) as Tally) })),
      overTime: buckets.map((date) => ({ date, rate: rate(byBucket.get(date) as Tally) })),
    };
  }

  private async _range(period: StatsPeriod, anchor: string, today: string, weekStart: 1 | 7, starts: string[]): Promise<{ from: string; to: string }> {
    if (period === 'week' || period === 'month') return periodOf(anchor, period, weekStart);
    if (period === 'year') return { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31` };
    const firstSingle = await this._items.findOne({ where: { type: 'task', recurrence: IsNull(), date: Not(IsNull()) }, order: { date: 'ASC' } });
    const earliest = [...starts, firstSingle?.date].filter((d): d is string => Boolean(d)).sort()[0] ?? today;
    return { from: earliest, to: today };
  }

  /** Progress toward each extra goal in the window containing `anchor`. */
  private async _goals(h: Awaited<ReturnType<HabitsService['findAllForStats']>>[number], anchor: string, weekStart: 1 | 7): Promise<StatsView['habits'][number]['goals']> {
    const out: StatsView['habits'][number]['goals'] = [];
    for (const [window, goal] of Object.entries(h.goals ?? {}) as [GoalWindow, { value: number; metric: 'days' | 'sum' }][]) {
      const w =
        window === 'weekly' ? periodOf(anchor, 'week', weekStart) : window === 'monthly' ? periodOf(anchor, 'month') : window === 'yearly' ? { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31` } : { from: h.startsOn, to: format(parseISO(anchor), 'yyyy-MM-dd') };
      const rows = await this._checkins.rowsBetween([h.id], w.from, w.to);
      const value = goal.metric === 'days' ? rows.filter((r) => r.status === 'done').length : rows.reduce((s, r) => s + (r.value ?? 0), 0);
      out.push({ window, value, target: goal.value, metric: goal.metric });
    }
    return out;
  }
}
