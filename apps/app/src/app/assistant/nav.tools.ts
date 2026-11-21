import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fail, ok, s, toSpec, type PageTool } from '@/lib/page-agent';
import { routes } from '@/lib/routes';

/** Screens the agent may open, and which `params` each takes (the rest are refused). */
const NAV_PARAMS = {
  today: ['date', 'category_id', 'assignee'],
  tasks: ['tab', 'assignee'],
  'tasks.form': ['task_id', 'periodic', 'date'],
  habits: ['tab'],
  'habits.form': ['habit_id'],
  stats: ['period', 'scope', 'anchor'],
  drafts: ['batch_id'],
} as const;
type NavScreen = keyof typeof NAV_PARAMS;
const SCREENS = Object.keys(NAV_PARAMS) as NavScreen[];

const query = (q: Record<string, string | undefined>) => {
  const sp = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => !!e[1]));
  const str = sp.toString();
  return str ? `?${str}` : '';
};

/** The address of a screen with its params (the same typed builders the tab bar and rows use). */
function pathOf(screen: NavScreen, p: Record<string, unknown>): string {
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : undefined);
  switch (screen) {
    case 'today':
      return `/today${query({ date: str('date'), category: str('category_id'), assignee: str('assignee') })}`;
    case 'tasks':
      return `${routes.tasks()}${query({ tab: str('tab') === 'periodic' ? 'periodic' : undefined, assignee: str('assignee') })}`;
    case 'tasks.form':
      return str('task_id') ? routes.taskEdit(str('task_id')!) : routes.taskNew({ periodic: p.periodic === true, date: str('date') });
    case 'habits':
      return `${routes.habits()}${query({ tab: str('tab') === 'archived' ? 'archived' : undefined })}`;
    case 'habits.form':
      return str('habit_id') ? routes.habitEdit(str('habit_id')!) : routes.habitNew();
    case 'stats':
      return `${routes.stats()}${query({ period: str('period'), scope: str('scope'), anchor: str('anchor') })}`;
    case 'drafts':
      return routes.drafts(str('batch_id'));
  }
}

const spec = toSpec('page_nav_open', {
  title: 'Open a screen',
  readOnly: true,
  description:
    'Open another screen of the tasker app. Screens: today (day plan; params date, category_id, assignee), tasks (task list; tab single|periodic, assignee me|agent slug), ' +
    'tasks.form (task_id to edit, or a new task with periodic, date), habits (tab active|archived), habits.form (habit_id to edit, or a new habit), ' +
    'stats (period week|month|year|all, scope habits|tasks|all, anchor date), drafts (batch_id: Mia’s recognised drafts). Unsaved form edits are lost.',
  input: s.obj(
    {
      screen: s.enumOf(SCREENS),
      params: s.obj({
        date: s.date('Day, YYYY-MM-DD'),
        category_id: s.str('Category id (today’s filter)'),
        assignee: s.str('today / tasks: "me" or an agent slug'),
        tab: s.enumOf(['single', 'periodic', 'active', 'archived']),
        task_id: s.str('Task id to edit'),
        periodic: s.bool('New periodic task'),
        habit_id: s.str('Habit id to edit'),
        period: s.enumOf(['week', 'month', 'year', 'all']),
        scope: s.enumOf(['habits', 'tasks', 'all']),
        anchor: s.date('A day inside the stats period'),
        batch_id: s.str('Draft batch id'),
      }),
    },
    ['screen'],
  ),
});

/** `page_nav_open {screen, params}` — offered on every screen (via the layouts' PageAgentExtras). */
export function useNavTool(): PageTool {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      ...spec,
      run: (a) => {
        const screen = a.screen as NavScreen;
        const params = (a.params ?? {}) as Record<string, unknown>;
        const allowed: readonly string[] = NAV_PARAMS[screen];
        const stray = Object.keys(params).filter((k) => !allowed.includes(k));
        if (stray.length) return fail(`${screen} takes only: ${allowed.join(', ') || 'no params'}`, `params.${stray[0]}`);
        const to = pathOf(screen, params);
        navigate(to);
        return ok({ screen, path: to });
      },
    }),
    [navigate],
  );
}
