import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { USER_ASSIGNEE, type AgentView } from '@/contracts/tasker';

/**
 * @ui AgentMark
 * @spec An agent's glyph in its own colour (the server's `icon` / `color`), with the name when `named`. Decorative next
 * to a label; `named` makes it the label.
 * @keywords agent, assignee, mia, claude, glyph, avatar
 */
export function AgentMark({ agent, named, className }: { agent: Pick<AgentView, 'name' | 'icon' | 'color'>; named?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span aria-hidden style={agent.color ? { color: agent.color } : undefined} className="leading-none">
        {agent.icon ?? '•'}
      </span>
      {named && <span>{agent.name}</span>}
    </span>
  );
}

/** «Я» for the user, otherwise the agent's name (or its slug when the agent list has not loaded). */
export const assigneeName = (slug: string, agents: AgentView[]) => (slug === USER_ASSIGNEE ? tr('Me') : (agents.find((a) => a.slug === slug)?.name ?? slug));
