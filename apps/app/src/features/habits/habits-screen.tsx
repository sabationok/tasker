import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore } from 'lucide-react';
import { tr } from '@/i18n';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { Badge, EmptyState, FlexBox, FlexRow, FlexUl, IconButton, QueryState, Segmented } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import type { HabitView } from '@/contracts/tasker';
import { EVALUATION_LABEL } from './habit.constants';
import { useArchiveHabit, useHabits, useRestoreHabit } from './habits.queries';

type Tab = 'active' | 'archived';

/** Active / archived habits; tap opens the form, the trailing button archives or restores. */
export function HabitsScreen() {
  const { query, patch } = useAppQuery<{ tab: Tab }>();
  const tab: Tab = query.tab ?? 'active';
  const habits = useHabits(tab);
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const list = habits.data ?? [];
  return (
    <FlexBox gap="md">
      <Segmented
        value={tab}
        onChange={(t) => patch({ tab: t === 'active' ? undefined : t })}
        options={[
          { value: 'active', label: tr('Active habits') },
          { value: 'archived', label: tr('Archived habits') },
        ]}
      />
      <QueryState isLoading={habits.isLoading} error={habits.error} onRetry={() => habits.refetch()}>
        {list.length === 0 ? (
          <EmptyState title={tab === 'active' ? tr('No habits yet.') : tr('No archived habits.')} />
        ) : (
          <FlexUl gap="xs" className="overflow-hidden rounded-2xl bg-surface">
            {list.map((h) => (
              <li key={h.id} className="border-b border-line last:border-0">
                <HabitListRow
                  habit={h}
                  action={
                    tab === 'active' ? (
                      <IconButton label={tr('Archive')} tone="bare" icon={<Archive className="size-4" />} disabled={archive.isPending} onClick={() => archive.mutate(h.id)} />
                    ) : (
                      <IconButton label={tr('Restore')} tone="bare" icon={<ArchiveRestore className="size-4" />} disabled={restore.isPending} onClick={() => restore.mutate(h.id)} />
                    )
                  }
                />
              </li>
            ))}
          </FlexUl>
        )}
      </QueryState>
    </FlexBox>
  );
}

function HabitListRow({ habit, action }: { habit: HabitView; action: React.ReactNode }) {
  return (
    <FlexRow gap="sm" className="px-3 py-3">
      <Link to={routes.habitEdit(habit.id)} className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryIcon category={habit.category} size={36} />
        <FlexBox fill gap="xs">
          <span className="truncate font-medium">{habit.name}</span>
          <FlexRow gap="xs" wrap>
            <Badge tone="accent">{tr(EVALUATION_LABEL[habit.evaluation])}</Badge>
            <Badge>{habit.recurrence.freq}</Badge>
            {habit.targetValue !== null && <Badge>{`${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ''}`}</Badge>}
          </FlexRow>
        </FlexBox>
      </Link>
      {action}
    </FlexRow>
  );
}
