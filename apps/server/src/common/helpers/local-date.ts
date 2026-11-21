import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** The owner's local calendar date (`YYYY-MM-DD`) of an instant. */
export function localDateOf(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, 'yyyy-MM-dd');
}

/** The instant of a local date + `HH:mm` in a time zone. */
export function instantOf(date: string, time: string, tz: string): Date {
  return fromZonedTime(`${date}T${time.length === 5 ? `${time}:00` : time}`, tz);
}

export function addLocalDays(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/** ISO weekday 1 (Mon) … 7 (Sun) of a local date string. */
export function isoWeekday(date: string): number {
  const d = parseISO(date).getDay();
  return d === 0 ? 7 : d;
}

/** Inclusive list of local dates from..to. */
export function eachLocalDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d);
  return out;
}
