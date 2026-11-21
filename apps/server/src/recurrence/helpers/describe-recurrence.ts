import type { Locale } from '../../common/i18n/messages';
import type { Recurrence } from '../recurrence.schema';

const WD: Record<Locale, string[]> = { uk: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };

/** A short human description for previews: «щодня», «пн, ср, пт», «3 дні на тиждень». */
export function describeRecurrence(rule: Recurrence, locale: Locale): string {
  const uk = locale === 'uk';
  switch (rule.freq) {
    case 'hourly':
      return uk ? `кожні ${rule.everyHours} год, ${rule.from}–${rule.to}` : `every ${rule.everyHours} h, ${rule.from}–${rule.to}`;
    case 'daily':
      return uk ? 'щодня' : 'daily';
    case 'weekly':
      return [...rule.weekdays].sort().map((d) => WD[locale][d - 1]).join(', ');
    case 'monthly':
      return uk ? `щомісяця: ${rule.monthDays.join(', ')}` : `monthly: ${rule.monthDays.join(', ')}`;
    case 'every_n_days':
      return uk ? `кожні ${rule.interval} дні` : `every ${rule.interval} days`;
    case 'days_per_period':
      return uk ? `${rule.count} дн. на ${rule.period === 'week' ? 'тиждень' : 'місяць'}` : `${rule.count} days per ${rule.period}`;
    case 'yearly_dates':
      return uk ? `щороку: ${rule.dates.join(', ')}` : `yearly: ${rule.dates.join(', ')}`;
  }
}
