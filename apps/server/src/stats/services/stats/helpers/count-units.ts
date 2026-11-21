import { periodOf } from '../../../../recurrence/helpers/period-of';
import { scheduledSlots } from '../../../../recurrence/helpers/scheduled-slots';
import type { Recurrence } from '../../../../recurrence/recurrence.schema';
import type { FailedMode } from '../../../../settings/types/settings.types';

export type UnitRow = { date: string; slot: number; status: 'done' | 'skipped' | 'failed' | null; movedTo?: string | null };
export type Unit = { date: string; result: 'completed' | 'skipped' | 'failed' };
export type Schedule = { recurrence: Recurrence; startsOn: string; endsOn: string | null };

/**
 * Counted units of one repeating thing between `from` and `to` (spec §11.1): one per scheduled slot, only days before
 * `today` (today counts once marked). `missed` mode counts an unmarked past slot as failed. `days_per_period`: the
 * shortfall of a finished period is failed on its last day.
 */
export function countUnits(s: Schedule, rows: UnitRow[], from: string, to: string, today: string, mode: FailedMode, weekStart: 1 | 7): Unit[] {
  const out: Unit[] = [];
  const at = new Map(rows.map((r) => [`${r.date}:${r.slot}`, r]));
  const marked = (r: UnitRow | undefined): Unit['result'] | null => (r?.status === 'done' ? 'completed' : r?.status === 'skipped' ? 'skipped' : r?.status === 'failed' ? 'failed' : null);
  if (s.recurrence.freq === 'days_per_period') {
    const rule = s.recurrence;
    for (const r of rows) {
      const m = marked(r);
      if (m && r.date >= from && r.date <= to && r.date >= s.startsOn) out.push({ date: r.date, result: m });
    }
    if (mode !== 'missed') return out;
    const seen = new Set<string>();
    for (const { date } of scheduledSlots(rule, s.startsOn, s.endsOn, from, to)) {
      const p = periodOf(date, rule.period, weekStart);
      if (seen.has(p.from)) continue;
      seen.add(p.from);
      if (p.to >= today || p.to > to) continue;
      const inP = rows.filter((r) => r.date >= p.from && r.date <= p.to);
      const short = rule.count - inP.filter((r) => r.status === 'done' || r.status === 'skipped').length;
      for (let i = 0; i < short; i++) out.push({ date: p.to, result: 'failed' });
    }
    return out;
  }
  const until = to < today ? to : today;
  for (const slot of scheduledSlots(s.recurrence, s.startsOn, s.endsOn, from, until)) {
    const row = at.get(`${slot.date}:${slot.slot}`);
    if (row?.movedTo) continue;
    const m = marked(row);
    if (m) out.push({ date: slot.date, result: m });
    else if (mode === 'missed' && slot.date < today) out.push({ date: slot.date, result: 'failed' });
  }
  for (const r of rows) {
    if (!r.movedTo || r.movedTo < from || r.movedTo > until) continue;
    const m = marked(r);
    if (m) out.push({ date: r.movedTo, result: m });
    else if (mode === 'missed' && r.movedTo < today) out.push({ date: r.movedTo, result: 'failed' });
  }
  return out;
}
