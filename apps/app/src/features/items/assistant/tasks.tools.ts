import { defineScreenTools, fail, ok, s, type PageScope } from '@/lib/page-agent';
import { today } from '@/lib/dates';
import { USER_ASSIGNEE, type AgentView, type ItemView, type OccurrenceTarget } from '@/contracts/tasker';

/* `tasks`: the task list (single / periodic tab in the URL). Completing uses the same mutation as Today's toggle. */

const taskId = s.str('The task id, from sections.tasks[].id');

export const tasksTools = defineScreenTools('tasks', {
  page_tasks_filter: {
    title: 'Filter the list',
    readOnly: true,
    description:
      'Show single (one-off) or periodic tasks, and whose: assignee "me" (the user), an agent slug from sections.agents (that agent’s open tasks), or null for everyone. Only the given keys change.',
    input: s.obj({ tab: s.enumOf(['single', 'periodic']), assignee: s.nullable(s.str('"me", an agent slug, or null for all')) }),
  },
  page_task_open: { title: 'Open a task', readOnly: true, description: 'Open a task in its form.', input: s.obj({ task_id: taskId }, ['task_id']) },
  page_task_new: {
    title: 'New task form',
    readOnly: true,
    description: 'Open an empty task form (nothing is saved until the form is submitted).',
    input: s.obj({ periodic: s.bool('A periodic task'), date: s.date('Its day (single) or first day (periodic)') }),
  },
  page_task_complete: {
    title: 'Complete a task',
    description: 'Mark a task done. For a periodic task this marks one day’s occurrence (`date`, today by default).',
    input: s.obj({ task_id: taskId, date: s.date('Periodic tasks: the day; today when omitted') }, ['task_id']),
  },
  page_task_uncomplete: {
    title: 'Reopen a task',
    description: 'Undo a task’s done mark (for a periodic task, one day’s occurrence: `date`, today by default).',
    input: s.obj({ task_id: taskId, date: s.date('Periodic tasks: the day; today when omitted') }, ['task_id']),
  },
});

type Tab = 'single' | 'periodic';
type Deps = {
  tab: Tab;
  assignee: string | undefined;
  agents: AgentView[];
  list: ItemView[] | undefined;
  /** One URL write for both (two separate writes in one tick would drop the first). */
  setFilter: (f: { tab?: Tab; assignee?: string | null }) => void;
  openTask: (id: string) => void;
  newTask: (q: { periodic?: boolean; date?: string }) => void;
  complete: (t: OccurrenceTarget) => Promise<unknown>;
  uncomplete: (t: OccurrenceTarget) => Promise<unknown>;
};

export function tasksScope(d: Deps): PageScope {
  const list = d.list ?? [];
  const find = (id: unknown) => list.find((i) => i.id === id);
  const missing = () => fail('No such task in this list', 'task_id', 'not-found:task');
  const target = (i: ItemView, date: unknown): OccurrenceTarget => (i.recurrence ? { id: i.id, date: (date as string | undefined) ?? today() } : { id: i.id });

  return tasksTools.scope({
    title: 'Задачі',
    params: { tab: d.tab, assignee: d.assignee ?? null },
    sections: d.list && {
      tab: d.tab,
      assignee: d.assignee ?? null,
      agents: d.agents.map((a) => ({ slug: a.slug, name: a.name })),
      tasks: list.map((i) => ({
        id: i.id,
        short_id: i.shortId,
        title: i.title,
        status: i.status,
        date: i.date,
        recurrence: i.recurrence?.freq ?? null,
        pending: i.pending,
        priority: i.priority,
        assignee: i.assignee,
        created_by: i.createdBy,
        ...(i.connector ? { connector: i.connector, connector_tools: i.connectorTools ?? [] } : {}),
        category: i.category?.name ?? null,
        project: i.project?.name ?? null,
        ...(i.checklist.length ? { checklist: { done: i.checklist.filter((c) => c.done).length, total: i.checklist.length } } : {}),
        ...(i.threads ? { threads: i.threads } : {}),
      })),
    },
    handlers: {
      page_tasks_filter: (a) => {
        if (typeof a.assignee === 'string' && a.assignee !== USER_ASSIGNEE && !d.agents.some((x) => x.slug === a.assignee))
          return fail('No such agent', 'assignee', 'not-found:agent');
        d.setFilter({ tab: a.tab as Tab | undefined, assignee: a.assignee as string | null | undefined });
        return ok({ tab: a.tab ?? d.tab, assignee: a.assignee === undefined ? (d.assignee ?? null) : a.assignee });
      },
      page_task_open: (a) => {
        const i = find(a.task_id);
        if (!i) return missing();
        d.openTask(i.id);
        return ok({ screen: 'tasks.form', task_id: i.id });
      },
      page_task_new: (a) => {
        d.newTask({ periodic: a.periodic === true, date: a.date as string | undefined });
        return ok({ screen: 'tasks.form' });
      },
      page_task_complete: async (a) => {
        const i = find(a.task_id);
        if (!i) return missing();
        await d.complete(target(i, a.date));
        return ok({ task_id: i.id, done: true });
      },
      page_task_uncomplete: async (a) => {
        const i = find(a.task_id);
        if (!i) return missing();
        await d.uncomplete(target(i, a.date));
        return ok({ task_id: i.id, done: false });
      },
    },
  });
}
