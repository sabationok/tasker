export const ITEM_TYPES = ['task', 'idea', 'note'] as const;
export const ITEM_STATUSES = ['inbox', 'todo', 'doing', 'blocked', 'done', 'archived'] as const;
export const SUBTASKS_ORDERS = ['any', 'sequential'] as const;
export const ITEM_EVALUATIONS = ['yes_no', 'checklist'] as const;
export const OCCURRENCE_STATUSES = ['done', 'skipped', 'failed'] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type SubtasksOrder = (typeof SUBTASKS_ORDERS)[number];
export type ItemEvaluation = (typeof ITEM_EVALUATIONS)[number];
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];
export type ItemSource = { client?: string; chatId?: string; messageId?: string };
