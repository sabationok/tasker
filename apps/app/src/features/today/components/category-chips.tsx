import { tr } from '@/i18n';
import { Chip, FlexRow } from '@/ui';
import type { TodayView } from '@/contracts/tasker';

/** @ui CategoryChips @spec «Completed N» + one chip per category with the day's count; tap filters. @keywords category filter, chips */
export function CategoryChips({ completed, categories, value, onChange }: { completed: number; categories: TodayView['categories']; value: string | undefined; onChange: (id: string | undefined) => void }) {
  return (
    <FlexRow gap="sm" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <Chip active={!value} onClick={() => onChange(undefined)}>
        {tr('Completed {n}', { n: completed })}
      </Chip>
      {categories.map((c) => (
        <Chip key={c.id} active={value === c.id} count={c.count} onClick={() => onChange(value === c.id ? undefined : c.id)}>
          {c.name}
        </Chip>
      ))}
    </FlexRow>
  );
}
