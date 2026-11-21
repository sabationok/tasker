/** Router groups for the hub's two-stage routing (module first, then tool); sent as `_meta.module` on every tool. */
export const TOOL_MODULES = {
  today: 'What is due today: tasks, periodic tasks and habits of a day',
  agents: "Agents and their to-dos: the calling agent's own assignments (take, finish, put off); who an item is assigned to",
  items: 'Tasks, ideas, notes and periodic tasks: create, change, complete, skip or move, sub-tasks, checklists',
  habits: 'Habits and their check-ins: create, change, check in, archive',
  catalog: 'Projects, categories (life areas) and tags',
  stats: 'Statistics: success rate, completed / skipped / failed, progress over time',
  settings: 'User settings: time zone, locale, week start, what counts as failed',
} as const;

export type ToolModuleId = keyof typeof TOOL_MODULES;

/** Each tool's module; the registry fails at start if a tool is missing here. */
export const TOOL_MODULE_OF: Record<string, ToolModuleId> = {
  get_today: 'today',
  my_assignments: 'agents',
  claim_assignment: 'agents',
  complete_assignment: 'agents',
  defer_assignment: 'agents',
  find_agents: 'agents',
  create_item: 'items',
  update_item: 'items',
  complete_item: 'items',
  uncomplete_item: 'items',
  skip_occurrence: 'items',
  move_occurrence: 'items',
  toggle_checklist_item: 'items',
  split_task: 'items',
  add_note: 'items',
  delete_item: 'items',
  get_item: 'items',
  list_items: 'items',
  find_items: 'items',
  create_habit: 'habits',
  update_habit: 'habits',
  check_in_habit: 'habits',
  archive_habit: 'habits',
  get_habit: 'habits',
  list_habits: 'habits',
  find_habits: 'habits',
  create_category: 'catalog',
  create_project: 'catalog',
  find_projects: 'catalog',
  find_categories: 'catalog',
  find_tags: 'catalog',
  get_stats: 'stats',
  update_settings: 'settings',
};
