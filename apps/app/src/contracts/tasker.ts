/**
 * tasker REST contract, mirrored from apps/server (zod schemas in each module's dto folder, views in its types folder).
 * TODO(server session): export these from a shared `packages/contracts` so the app imports instead of mirroring.
 */

export type CategoryRef = { id: string; name: string; icon: string; color: string };
export type Category = CategoryRef & { position: number; isDefault: boolean; archivedAt: string | null };

export const ITEM_TYPES = ['task', 'idea', 'note'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemStatus = 'inbox' | 'todo' | 'doing' | 'blocked' | 'done' | 'archived';
export type SubtasksOrder = 'any' | 'sequential';
export type ItemEvaluation = 'yes_no' | 'checklist';
export type Priority = 1 | 2 | 3;

export type Recurrence =
  | { freq: 'hourly'; everyHours: number; from: string; to: string }
  | { freq: 'daily' }
  | { freq: 'weekly'; weekdays: number[] }
  | { freq: 'monthly'; monthDays: number[] }
  | { freq: 'every_n_days'; interval: number }
  | { freq: 'days_per_period'; count: number; period: 'week' | 'month' }
  | { freq: 'yearly_dates'; dates: string[] };
export type Freq = Recurrence['freq'];

export type ReminderView = { id: string; at: string | null; timeOfDay: string | null; offsetMin: number | null };
export type ReminderInput = { at: string } | { timeOfDay: string } | { offsetMin: number };
export type ChecklistLine = { id: string; title: string; position: number; done: boolean };

export type ItemView = {
  id: string;
  shortId: number;
  type: ItemType;
  title: string;
  body: string | null;
  status: ItemStatus;
  priority: Priority | null;
  date: string | null;
  dueAt: string | null;
  pending: boolean;
  parentId: string | null;
  position: number;
  subtasksOrder: SubtasksOrder;
  recurrence: Recurrence | null;
  startsOn: string | null;
  endsOn: string | null;
  evaluation: ItemEvaluation;
  doneAt: string | null;
  category: CategoryRef | null;
  project: { id: string; name: string } | null;
  checklist: ChecklistLine[];
  reminders: ReminderView[];
  threads: { done: number; total: number } | null;
  locked: boolean;
};

export type ItemInput = {
  type: ItemType;
  title: string;
  body?: string | null;
  priority?: Priority | null;
  categoryId?: string;
  date?: string | null;
  pending?: boolean;
  recurrence?: Recurrence | null;
  startsOn?: string;
  endsOn?: string | null;
  evaluation?: ItemEvaluation;
  checklist?: { id?: string; title: string }[];
  reminders?: ReminderInput[];
};

export type SplitInput = { id: string; order: SubtasksOrder; threads: { title: string; date?: string }[] };
export type OccurrenceTarget = { id: string; date?: string; slot?: number };

export const HABIT_EVALUATIONS = ['yes_no', 'numeric', 'checklist', 'timer', 'stopwatch'] as const;
export type HabitEvaluation = (typeof HABIT_EVALUATIONS)[number];
export type TargetCondition = 'at_least' | 'at_most' | 'exactly';
export const GOAL_WINDOWS = ['weekly', 'monthly', 'yearly', 'allTime'] as const;
export type GoalWindow = (typeof GOAL_WINDOWS)[number];
export type Goal = { value: number; metric: 'days' | 'sum' };
export type HabitGoals = Partial<Record<GoalWindow, Goal>>;

export type HabitView = {
  id: string;
  shortId: number;
  name: string;
  description: string | null;
  priority: Priority | null;
  evaluation: HabitEvaluation;
  targetValue: number | null;
  targetCondition: TargetCondition | null;
  unit: string | null;
  checklistMin: number | null;
  recurrence: Recurrence;
  startsOn: string;
  endsOn: string | null;
  goals: HabitGoals;
  notesEnabled: boolean;
  status: 'active' | 'archived';
  category: CategoryRef | null;
  checklist: { id: string; title: string; position: number }[];
  reminders: ReminderView[];
};

export type HabitInput = {
  name: string;
  description?: string | null;
  categoryId?: string;
  priority?: Priority | null;
  evaluation: HabitEvaluation;
  targetValue?: number | null;
  targetCondition?: TargetCondition | null;
  unit?: string | null;
  checklist?: { id?: string; title: string }[];
  checklistMin?: number | null;
  recurrence: Recurrence;
  startsOn?: string;
  endsOn?: string | null;
  goals?: HabitGoals;
  notesEnabled?: boolean;
  reminders?: { timeOfDay: string }[];
};

export type CheckInInput = {
  habitId: string;
  date?: string;
  slot?: number;
  value?: number;
  checklistDone?: string[];
  note?: string;
  status?: 'done' | 'skipped' | 'failed' | 'none';
};
export type CheckinView = { id: string; date: string; slot: number; status: 'done' | 'skipped' | 'failed' | null; value: number | null; checklistDone: string[]; note: string | null };

export type TodayEntry = {
  source: 'task' | 'occurrence' | 'habit';
  key: string;
  itemId?: string;
  habitId?: string;
  shortId?: number;
  date: string;
  slot?: number;
  title: string;
  type: 'task' | 'habit';
  category: CategoryRef | null;
  priority: number | null;
  checklist?: { done: number; total: number };
  threads?: { done: number; total: number };
  habit?: { evaluation: HabitEvaluation; value: number | null; target: number | null; unit: string | null };
  done: boolean;
  status?: 'done' | 'skipped' | 'failed';
  late?: boolean;
};
export type TodayView = {
  date: string;
  progress: { done: number; total: number; percent: number };
  categories: (CategoryRef & { count: number })[];
  completed: number;
  entries: TodayEntry[];
};
export type StripDay = { date: string; done: number; total: number; percent: number };

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';
export type StatsScope = 'habits' | 'tasks' | 'all';
export type Tally = { completed: number; skipped: number; failed: number };
export type StatsView = {
  period: { type: StatsPeriod; from: string; to: string };
  summary: { successRate: number | null } & Tally;
  habits: { id: string; name: string; score: number | null; goals: { window: string; value: number; target: number; metric: 'days' | 'sum' }[] }[];
  distribution: Tally;
  byDay: ({ date: string } & Tally)[];
  overTime: { date: string; rate: number | null }[];
};

export type DraftStatus = 'draft' | 'saved' | 'discarded' | 'expired';
export type DraftPreview = { refs: Record<string, unknown>; computed: Record<string, string>; warnings: string[] };
export type DraftView = {
  id: string;
  batchId: string;
  tool: string;
  dto: Record<string, unknown>;
  preview: DraftPreview | null;
  status: DraftStatus;
  resultId: string | null;
  createdAt: string;
  expiresAt: string;
};
export type SaveBatchResult = { draftId: string; status: 'saved' | 'invalid' | 'skipped'; errors?: { path?: string; message: string }[] }[];
