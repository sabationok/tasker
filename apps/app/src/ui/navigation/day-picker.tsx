import { cn } from '@/lib/cn';
import { FlexRow } from '../layout/flex';
import { IconButton } from '../primitives/icon-button';
import { Text } from '../primitives/text';

/**
 * @ui DayPicker
 * @spec A row of days (label, number, completion bar) with prev / next; the selected day uses the `selected` tokens.
 * @keywords day picker, week, date strip, calendar row
 */
export type DayPickerDay = { date: string; weekday: string; day: number; percent: number | null; isToday?: boolean };

export function DayPicker({ days, selected, onSelect, onPrev, onNext, prevLabel, nextLabel }: {
  days: DayPickerDay[];
  selected: string;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <FlexRow gap="xs">
      <IconButton label={prevLabel} tone="bare" icon="prev" onClick={onPrev} />
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const active = d.date === selected;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={active}
              aria-current={d.isToday ? 'date' : undefined}
              onClick={() => onSelect(d.date)}
              className={cn('flex flex-col items-center gap-0.5 rounded-control border py-1.5 transition', active ? 'border-selected bg-selected text-selected-fg' : 'border-transparent hover:bg-sunken', !active && d.isToday && 'border-line')}
            >
              <span className={cn('text-micro uppercase', !active && 'text-muted')}>{d.weekday}</span>
              <span className="text-body font-strong">{d.day}</span>
              <span className="h-0.5 w-4 overflow-hidden rounded-pill bg-line">
                <span className={cn('block h-full', active ? 'bg-selected-fg' : 'bg-accent')} style={{ width: `${d.percent ?? 0}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <IconButton label={nextLabel} tone="bare" icon="next" onClick={onNext} />
    </FlexRow>
  );
}

/** @ui PageHeader @spec Page title with an optional trailing action. @keywords page header, title row */
export const PageHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <FlexRow justify="between">
    <Text variant="title">{title}</Text>
    {action}
  </FlexRow>
);
