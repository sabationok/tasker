/** Typed link builders for the mobile / web app. (Mia's draft review as an MCP App lives in `apps/mcp-app`.) */
export const routes = {
  today: (q?: { date?: string }) => (q?.date ? `/today?date=${q.date}` : '/today'),
  tasks: (q?: { assignee?: string }) => (q?.assignee ? `/tasks?assignee=${encodeURIComponent(q.assignee)}` : '/tasks'),
  taskNew: (q?: { periodic?: boolean; date?: string }) => {
    const sp = new URLSearchParams();
    if (q?.periodic) sp.set('periodic', '1');
    if (q?.date) sp.set('date', q.date);
    const s = sp.toString();
    return `/tasks/new${s ? `?${s}` : ''}`;
  },
  taskEdit: (id: string) => `/tasks/${id}`,
  habits: () => '/habits',
  habitNew: () => '/habits/new',
  habitEdit: (id: string) => `/habits/${id}`,
  stats: () => '/stats',
  drafts: (batchId?: string) => (batchId ? `/drafts?batchId=${batchId}` : '/drafts'),
} as const;
