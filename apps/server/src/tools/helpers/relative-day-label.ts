import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Locale } from '../../common/i18n/messages';

const WORDS: Record<Locale, Record<number, string>> = { uk: { [-1]: 'вчора', 0: 'сьогодні', 1: 'завтра', 2: 'післязавтра' }, en: { [-1]: 'yesterday', 0: 'today', 1: 'tomorrow' } };

/** «завтра», «пт, 21 листопада», «3 грудня 2027» relative to `today` (local dates). */
export function relativeDayLabel(date: string, today: string, locale: Locale): string {
  const diff = differenceInCalendarDays(parseISO(date), parseISO(today));
  if (WORDS[locale][diff]) return WORDS[locale][diff];
  const d = new Date(`${date}T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', timeZone: 'UTC', ...(Math.abs(diff) <= 6 && { weekday: 'short' }), ...(date.slice(0, 4) !== today.slice(0, 4) && { year: 'numeric' }) };
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', opts).format(d);
}

/** «завтра, 10:00» for an instant. */
export function relativeMomentLabel(instant: Date, today: string, tz: string, locale: Locale): string {
  return `${relativeDayLabel(formatInTimeZone(instant, tz, 'yyyy-MM-dd'), today, locale)}, ${formatInTimeZone(instant, tz, 'HH:mm')}`;
}
