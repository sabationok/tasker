import { Link } from 'react-router-dom';
import { Bell, GitBranch, ListChecks } from 'lucide-react';
import { intlLocale, tr } from '@/i18n';
import { formatDay } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { Badge, EmptyState, FlexBox, FlexRow, FlexUl, QueryState, Segmented } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import type { ItemView } from '@/contracts/tasker';
import { useItems } from './items.queries';

type Tab = 'single' | 'periodic';

/** All tasks (not ideas / notes), single or periodic; tap opens the form. */
export function TasksScreen() {
  const { query, patch } = useAppQuery<{ tab: Tab }>();
  const tab: Tab = query.tab ?? 'single';
  const items = useItems({ type: 'task', periodic: tab === 'periodic' });
  const list = (items.data ?? []).filter((i) => !i.parentId);
  return (
    <FlexBox gap="md">
      <Segmented
        value={tab}
        onChange={(t) => patch({ tab: t === 'single' ? undefined : t })}
        options={[
          { value: 'single', label: tr('Single tasks') },
          { value: 'periodic', label: tr('Periodic tasks') },
        ]}
      />
      <QueryState isLoading={items.isLoading} error={items.error} onRetry={() => items.refetch()}>
        {list.length === 0 ? (
          <EmptyState title={tr('No tasks yet.')} />
        ) : (
          <FlexUl gap="xs" className="overflow-hidden rounded-2xl bg-surface">
            {list.map((i) => (
              <li key={i.id} className="border-b border-line last:border-0">
                <TaskListRow item={i} />
              </li>
            ))}
          </FlexUl>
        )}
      </QueryState>
    </FlexBox>
  );
}

function TaskListRow({ item }: { item: ItemView }) {
  const done = item.status === 'done';
  return (
    <Link to={routes.taskEdit(item.id)} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-2">
      <CategoryIcon category={item.category} size={36} />
      <FlexBox fill gap="xs">
        <span className={done ? 'truncate text-muted line-through' : 'truncate font-medium'}>
          <span className="mr-1.5 text-muted">#{item.shortId}</span>
          {item.title}
        </span>
        <FlexRow gap="xs" wrap>
          {item.date && <Badge>{formatDay(item.date, intlLocale, { day: 'numeric', month: 'short' })}</Badge>}
          {item.recurrence && <Badge tone="accent">{item.recurrence.freq}</Badge>}
          {item.pending && <Badge tone="warning">{tr('Pending')}</Badge>}
          {item.checklist.length > 0 && (
            <Badge>
              <ListChecks className="size-3" />
              {item.checklist.filter((c) => c.done).length}/{item.checklist.length}
            </Badge>
          )}
          {item.threads && (
            <Badge>
              <GitBranch className="size-3" />
              {item.threads.done}/{item.threads.total}
            </Badge>
          )}
          {item.reminders.length > 0 && (
            <Badge>
              <Bell className="size-3" />
              {item.reminders.length}
            </Badge>
          )}
          {item.project && <Badge>{item.project.name}</Badge>}
        </FlexRow>
      </FlexBox>
    </Link>
  );
}
