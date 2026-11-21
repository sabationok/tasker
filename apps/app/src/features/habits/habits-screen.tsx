import { tr } from '@/i18n';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { Badge, EmptyState, FlexBox, IconButton, ListGroup, ListRow, ListRowMeta, QueryState, Segmented, Text } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import { EVALUATION_LABEL } from './habit.constants';
import { useNavigate } from 'react-router-dom';
import { usePageAgent } from '@/lib/page-agent';
import { useArchiveHabit, useCheckIn, useHabits, useRestoreHabit } from './habits.queries';
import { habitsScope } from './assistant/habits.tools';

type Tab = 'active' | 'archived';

/** Active / archived habits; tap opens the form, the trailing button archives or restores. */
export function HabitsScreen() {
  const { query, patch } = useAppQuery<{ tab: Tab }>();
  const tab: Tab = query.tab ?? 'active';
  const habits = useHabits(tab);
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const list = habits.data ?? [];
  const navigate = useNavigate();
  const checkIn = useCheckIn();
  usePageAgent(
    habitsScope({
      tab,
      list: habits.data,
      setTab: (t) => patch({ tab: t === 'active' ? undefined : t }),
      openHabit: (id) => navigate(routes.habitEdit(id)),
      newHabit: () => navigate(routes.habitNew()),
      checkIn: checkIn.mutateAsync,
      archive: archive.mutateAsync,
      restore: restore.mutateAsync,
    }),
  );
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
          <ListGroup label={tr('Habits')}>
            {list.map((h) => (
              <ListRow
                key={h.id}
                to={routes.habitEdit(h.id)}
                leading={<CategoryIcon category={h.category} size="sm" />}
                trailing={
                  tab === 'active' ? (
                    <IconButton label={tr('Archive')} tone="bare" icon="archive" disabled={archive.isPending} onClick={() => archive.mutate(h.id)} />
                  ) : (
                    <IconButton label={tr('Restore')} tone="bare" icon="restore" disabled={restore.isPending} onClick={() => restore.mutate(h.id)} />
                  )
                }
              >
                <Text variant="strong" truncate>
                  {h.name}
                </Text>
                <ListRowMeta>
                  <Badge tone="accent">{tr(EVALUATION_LABEL[h.evaluation])}</Badge>
                  <Badge icon="periodic">{h.recurrence.freq}</Badge>
                  {h.targetValue !== null && <Badge>{`${h.targetValue}${h.unit ? ` ${h.unit}` : ''}`}</Badge>}
                </ListRowMeta>
              </ListRow>
            ))}
          </ListGroup>
        )}
      </QueryState>
    </FlexBox>
  );
}
