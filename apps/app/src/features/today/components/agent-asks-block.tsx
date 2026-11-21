import { intlLocale, tr } from '@/i18n';
import { formatDay } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { Badge, ListGroup, ListRow, ListRowMeta, Text } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import { useItems } from '@/features/items/items.queries';
import { AgentMark } from '@/features/agents/agent-mark';
import { USER_ASSIGNEE, type AgentView } from '@/contracts/tasker';

/** The agent whose requests Today shows (the one the user talks to every day). */
const ASKING_AGENT = 'mia';

/**
 * @ui AgentAsksBlock
 * @spec «Mia чекає від тебе»: open tasks Mia made and assigned to the user, each opening its form; then a link to
 * Mia's own open tasks. Renders nothing while there are none.
 * @keywords agent, mia, waiting, assigned to me, requests, today
 */
export function AgentAsksBlock({ agents }: { agents: AgentView[] }) {
  const agent = agents.find((a) => a.slug === ASKING_AGENT);
  const asks = useItems({ type: 'task', open: true, assignee: USER_ASSIGNEE, createdBy: ASKING_AGENT }, !!agent);
  const list = asks.data ?? [];
  if (!agent || list.length === 0) return null;
  return (
    <section aria-label={tr('{name} is waiting on you', { name: agent.name })}>
      <Text variant="overline" tone="muted" className="mb-1.5 flex items-center gap-1.5">
        <AgentMark agent={agent} />
        {tr('{name} is waiting on you', { name: agent.name })}
      </Text>
      <ListGroup label={tr('{name} is waiting on you', { name: agent.name })}>
        {list.map((i) => (
          <ListRow key={i.id} to={routes.taskEdit(i.id)} leading={<CategoryIcon category={i.category} size="sm" />}>
            <Text variant="strong" truncate>{`#${i.shortId} ${i.title}`}</Text>
            {i.date && (
              <ListRowMeta>
                <Badge>{formatDay(i.date, intlLocale, { day: 'numeric', month: 'short' })}</Badge>
              </ListRowMeta>
            )}
          </ListRow>
        ))}
        <ListRow to={routes.tasks({ assignee: agent.slug })} leading={<AgentMark agent={agent} className="w-6 justify-center text-title" />}>
          <Text variant="label" tone="muted">
            {tr('Tasks of {name}', { name: agent.name })}
          </Text>
        </ListRow>
      </ListGroup>
    </section>
  );
}
