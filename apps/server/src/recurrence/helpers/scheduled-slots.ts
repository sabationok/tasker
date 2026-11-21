import { differenceInCalendarDays, getDaysInMonth, parseISO } from 'date-fns';
import { eachLocalDate, isoWeekday } from '../../common/helpers/local-date';
import type { Recurrence } from '../recurrence.schema';
import type { Slot } from '../types/recurrence.types';

const minutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Hours (local wall clock) of an hourly rule on any day — computed on wall-clock time, so DST cannot duplicate a slot. */
export function hourlySlots(rule: Extract<Recurrence, { freq: 'hourly' }>): number[] {
  const out: number[] = [];
  for (let m = minutes(rule.from); m <= minutes(rule.to); m += rule.everyHours * 60) out.push(Math.floor(m / 60));
  return out;
}

/** Whether a rule schedules a local date (ignores the start / end window). `days_per_period` → every day (flexible). */
export function isScheduledOn(rule: Recurrence, startsOn: string, date: string): boolean {
  switch (rule.freq) {
    case 'hourly':
    case 'daily':
    case 'days_per_period':
      return true;
    case 'weekly':
      return rule.weekdays.includes(isoWeekday(date));
    case 'monthly': {
      const day = Number(date.slice(8, 10));
      const last = getDaysInMonth(parseISO(date));
      return rule.monthDays.some((d) => Math.min(d, last) === day);
    }
    case 'every_n_days':
      return differenceInCalendarDays(parseISO(date), parseISO(startsOn)) % rule.interval === 0;
    case 'yearly_dates':
      return rule.dates.includes(date.slice(5, 10));
  }
}

/** Scheduled slots of a rule between `from` and `to` (inclusive), clipped to `startsOn` … `endsOn`. */
export function scheduledSlots(rule: Recurrence, startsOn: string, endsOn: string | null, from: string, to: string): Slot[] {
  const lo = from > startsOn ? from : startsOn;
  const hi = endsOn && endsOn < to ? endsOn : to;
  if (lo > hi) return [];
  const hours = rule.freq === 'hourly' ? hourlySlots(rule) : [0];
  return eachLocalDate(lo, hi)
    .filter((date) => isScheduledOn(rule, startsOn, date))
    .flatMap((date) => hours.map((slot) => ({ date, slot })));
}
