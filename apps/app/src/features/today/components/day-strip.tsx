import { ChevronLeft, ChevronRight } from 'lucide-react';
import { intlLocale, tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { parseIsoDate, today } from '@/lib/dates';
import { FlexRow, IconButton } from '@/ui';
import type { StripDay } from '@/contracts/tasker';

/**
 * @ui DayStrip
 * @spec A week of days with per-day progress; the selected day is filled, today is outlined. Arrows shift by a week.
 * @keywords day strip, week, calendar, date picker
 */
export function DayStrip({ days, selected, onSelect, onShift }: { days: StripDay[]; selected: string; onSelect: (d: string) => void; onShift: (weeks: number) => void }) {
  const now = today();
  const wd = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' });
  return (
    <FlexRow gap="xs">
      <IconButton label={tr('Week')} tone="bare" icon={<ChevronLeft className="size-4" />} onClick={() => onShift(-1)} />
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const active = d.date === selected;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(d.date)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs transition',
                active ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2',
                !active && d.date === now && 'ring-1 ring-accent',
              )}
            >
              <span className="uppercase">{wd.format(parseIsoDate(d.date))}</span>
              <span className={cn('text-[15px] font-semibold', !active && 'text-fg')}>{parseIsoDate(d.date).getDate()}</span>
              <span className={cn('h-1 w-5 overflow-hidden rounded-full', active ? 'bg-white/30' : 'bg-line')}>
                <span className={cn('block h-full rounded-full', active ? 'bg-white' : 'bg-success')} style={{ width: `${d.total ? d.percent : 0}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <IconButton label={tr('Week')} tone="bare" icon={<ChevronRight className="size-4" />} onClick={() => onShift(1)} />
    </FlexRow>
  );
}
