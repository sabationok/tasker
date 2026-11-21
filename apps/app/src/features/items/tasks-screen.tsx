import { intlLocale, tr } from '@/i18n';
import { formatDay } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { Badge, EmptyState, FlexBox, ListGroup, ListRow, ListRowMeta, QueryState, Segmented, Text } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import type { ItemView } from '@/contracts/tasker';
import { useNavigate } from 'react-router-dom';
import { usePageAgent } from '@/lib/page-agent';
import { useCompleteItem, useItems, useUncompleteItem } from './items.queries';
import { tasksScope } from './assistant/tasks.tools';
import { useAgents } from '@/features/agents/agents.queries';
import { AgentMark, assigneeName } from '@/features/agents/agent-mark';
import { AssigneeChips } from '@/features/agents/assignee-chips';
import { ConnectorBadge } from '@/features/agents/connector-mark';
import { USER_ASSIGNEE, type AgentView } from '@/contracts/tasker';

type Tab = 'single' | 'periodic';

/**
 * All tasks (not ideas / notes), single or periodic; tap opens the form. `assignee` (URL) narrows to the user's or one
 * agent's to-dos; an agent's list shows only open ones («Задачі Mia»).
 */
export function TasksScreen() {
  const { query, patch } = useAppQuery<{ tab: Tab; assignee: string }>();
  const tab: Tab = query.tab ?? 'single';
  const agents = useAgents();
  const assignee = query.assignee;
  const ofAgent = !!assignee && assignee !== USER_ASSIGNEE;
  const items = useItems({ type: 'task', periodic: tab === 'periodic', assignee, ...(ofAgent ? { open: true } : {}) });
  const list = (items.data ?? []).filter((i) => !i.parentId);
  const navigate = useNavigate();
  const complete = useCompleteItem();
  const uncomplete = useUncompleteItem();
  usePageAgent(
    tasksScope({
      tab,
      assignee,
      agents,
      list: items.data && list,
      setFilter: (f) =>
        patch({
          ...(f.tab ? { tab: f.tab === 'single' ? undefined : f.tab } : {}),
          ...(f.assignee !== undefined ? { assignee: f.assignee ?? undefined } : {}),
        }),
      openTask: (id) => navigate(routes.taskEdit(id)),
      newTask: (q) => navigate(routes.taskNew(q)),
      complete: complete.mutateAsync,
      uncomplete: uncomplete.mutateAsync,
    }),
  );
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
      <AssigneeChips agents={agents} value={assignee} onChange={(a) => patch({ assignee: a })} />
      <QueryState isLoading={items.isLoading} error={items.error} onRetry={() => items.refetch()}>
        {list.length === 0 ? (
          <EmptyState title={ofAgent ? tr('{name} has no open tasks.', { name: assigneeName(assignee, agents) }) : tr('No tasks yet.')} />
        ) : (
          <ListGroup label={ofAgent ? tr('Tasks of {name}', { name: assigneeName(assignee, agents) }) : tr('Tasks')}>
            {list.map((i) => (
              <TaskListRow key={i.id} item={i} agents={agents} />
            ))}
          </ListGroup>
        )}
      </QueryState>
    </FlexBox>
  );
}

function TaskListRow({ item, agents }: { item: ItemView; agents: AgentView[] }) {
  const agent = agents.find((a) => a.slug === item.assignee);
  const author = item.createdBy !== USER_ASSIGNEE && item.createdBy !== item.assignee ? agents.find((a) => a.slug === item.createdBy) : undefined;
  return (
    <ListRow to={routes.taskEdit(item.id)} leading={<CategoryIcon category={item.category} size="sm" />}>
      <Text variant="strong" strike={item.status === 'done'} truncate>
        {`#${item.shortId} ${item.title}`}
      </Text>
      <ListRowMeta>
        {agent && (
          <Badge>
            <AgentMark agent={agent} named />
          </Badge>
        )}
        {author && <Badge>{tr('from {name}', { name: author.name })}</Badge>}
        <ConnectorBadge connector={item.connector} connectorTools={item.connectorTools} />
        {item.date && <Badge>{formatDay(item.date, intlLocale, { day: 'numeric', month: 'short' })}</Badge>}
        {item.recurrence && <Badge tone="accent" icon="periodic">{item.recurrence.freq}</Badge>}
        {item.pending && <Badge tone="caution">{tr('Pending')}</Badge>}
        {item.checklist.length > 0 && (
          <Badge icon="checklist">
            {item.checklist.filter((c) => c.done).length}/{item.checklist.length}
          </Badge>
        )}
        {item.threads && (
          <Badge icon="threads">
            {item.threads.done}/{item.threads.total}
          </Badge>
        )}
        {item.reminders.length > 0 && <Badge icon="reminder">{item.reminders.length}</Badge>}
        {item.project && <Badge>{item.project.name}</Badge>}
      </ListRowMeta>
    </ListRow>
  );
}
