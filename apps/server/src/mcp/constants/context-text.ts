/** `tasker://context` — what tasker holds, for the hub's routing (a few lines). */
export const MCP_CONTEXT_TEXT = [
  'tasker: the user\'s tasks (задачі), periodic tasks (щоденні / щотижневі справи), habits (звички), ideas (ідеї) and notes (нотатки).',
  'A reminder is a task with remind_at. A task may be split into threads (потоки), run in any order or one after another.',
  'Categories (Здоровʼя, Дім, Робота, …) group everything; projects are work projects only (e.g. Mia) and are separate from categories.',
  'Items have #numbers: resolve them with find_items; projects, categories, tags and habits have their own find_* lookups.',
  'Today (get_today) shows the day\'s tasks, periodic tasks and habits; get_stats gives completion / failure stats.',
].join('\n');

export const MCP_RESOURCE_URIS = { context: 'tasker://context', today: 'tasker://today', draftsPrefix: 'tasker://drafts/' } as const;
