import { tr } from '@/i18n';
import { Chip, ScrollRow } from '@/ui';
import { USER_ASSIGNEE, type AgentView } from '@/contracts/tasker';
import { AgentMark } from './agent-mark';

/**
 * @ui AssigneeChips
 * @spec «All» · «Me» · one chip per agent (its glyph and colour); tap filters by whose to-do it is, tap again clears.
 * Renders nothing without agents (then everything is the user's).
 * @keywords assignee, agent, filter, chips, whose
 */
export function AssigneeChips({ agents, value, onChange }: { agents: AgentView[]; value: string | undefined; onChange: (v: string | undefined) => void }) {
  if (!agents.length) return null;
  const pick = (v: string) => onChange(value === v ? undefined : v);
  return (
    <ScrollRow label={tr('Assignee')}>
      <Chip active={!value} onClick={() => onChange(undefined)}>
        {tr('All')}
      </Chip>
      <Chip active={value === USER_ASSIGNEE} onClick={() => pick(USER_ASSIGNEE)}>
        {tr('Me')}
      </Chip>
      {agents.map((a) => (
        <Chip key={a.slug} active={value === a.slug} onClick={() => pick(a.slug)}>
          <AgentMark agent={a} named />
        </Chip>
      ))}
    </ScrollRow>
  );
}
