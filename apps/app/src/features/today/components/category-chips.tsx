import { tr } from '@/i18n';
import { Chip, ScrollRow } from '@/ui';
import type { TodayView } from '@/contracts/tasker';

/** «All» + one chip per category with the day's count; tap filters. */
export function CategoryChips({ categories, value, onChange }: { categories: TodayView['categories']; value: string | undefined; onChange: (id: string | undefined) => void }) {
  return (
    <ScrollRow label={tr('Category')}>
      <Chip active={!value} onClick={() => onChange(undefined)}>
        {tr('All')}
      </Chip>
      {categories.map((c) => (
        <Chip key={c.id} active={value === c.id} count={c.count} onClick={() => onChange(value === c.id ? undefined : c.id)}>
          {c.name}
        </Chip>
      ))}
    </ScrollRow>
  );
}
