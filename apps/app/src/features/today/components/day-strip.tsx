import { intlLocale, tr } from '@/i18n';
import { parseIsoDate, today } from '@/lib/dates';
import { DayPicker } from '@/ui';
import type { StripDay } from '@/contracts/tasker';

/** The week from `/today/strip` mapped onto the theme's DayPicker. */
export function DayStrip({ days, selected, onSelect, onShift }: { days: StripDay[]; selected: string; onSelect: (d: string) => void; onShift: (weeks: number) => void }) {
  const now = today();
  const wd = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' });
  return (
    <DayPicker
      days={days.map((d) => ({ date: d.date, weekday: wd.format(parseIsoDate(d.date)), day: parseIsoDate(d.date).getDate(), percent: d.total ? d.percent : null, isToday: d.date === now }))}
      selected={selected}
      onSelect={onSelect}
      onPrev={() => onShift(-1)}
      onNext={() => onShift(1)}
      prevLabel={tr('Previous week')}
      nextLabel={tr('Next week')}
    />
  );
}
