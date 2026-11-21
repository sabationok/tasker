import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { addLocalDays, isoWeekday } from '../../common/helpers/local-date';

/** The week or month containing a local date. `weekStart` 1 = Monday, 7 = Sunday. */
export function periodOf(date: string, period: 'week' | 'month', weekStart: 1 | 7 = 1): { from: string; to: string } {
  if (period === 'month') {
    const d = parseISO(date);
    return { from: format(startOfMonth(d), 'yyyy-MM-dd'), to: format(endOfMonth(d), 'yyyy-MM-dd') };
  }
  const wd = isoWeekday(date);
  const back = weekStart === 1 ? wd - 1 : wd % 7;
  const from = addLocalDays(date, -back);
  return { from, to: addLocalDays(from, 6) };
}
