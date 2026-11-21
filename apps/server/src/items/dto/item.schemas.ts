import { z } from 'zod';
import { AGENT_SLUG, CONNECTOR_SLUG, CONNECTOR_TOOL } from '../../agents/types/agent.types';
import { recurrenceSchema } from '../../recurrence/recurrence.schema';
import { reminderInputSchema } from '../../reminders/dto/reminder-input.schema';
import { ITEM_EVALUATIONS, ITEM_STATUSES, ITEM_TYPES, OCCURRENCE_STATUSES, SUBTASKS_ORDERS } from '../types/item.types';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const uuid = z.string().uuid();
const assignee = z.string().regex(AGENT_SLUG, 'me or an agent slug');

export const checklistInputSchema = z
  .array(
    z
      .object({
        id: uuid.optional().describe('An existing checklist line to keep (omit for a new one)'),
        title: z.string().min(1).max(200).describe('Checklist line text'),
      })
      .strict(),
  )
  .max(100)
  .describe('Ordered checklist lines; on update the list replaces the current one');

const itemFields = {
  type: z.enum(ITEM_TYPES).describe('task = something to do; idea = to think about later; note = information to keep'),
  title: z.string().min(1).max(200).describe("Short title in the user's words, without date words"),
  body: z.string().max(20000).nullable().optional().describe('Longer description'),
  status: z.enum(ITEM_STATUSES).optional().describe('Workflow status; default todo'),
  assignee: assignee.optional().describe("Whose to-do it is: me = the user (default), or an agent's slug (resolved with find_agents)"),
  connector: z.string().regex(CONNECTOR_SLUG).nullable().optional().describe("For an agent's to-do: the connector to work in, e.g. fintrack (the body says what to check and why; recurrence + a timeOfDay reminder make it regular)"),
  connectorTools: z.array(z.string().regex(CONNECTOR_TOOL)).min(1).max(10).nullable().optional().describe("With connector: that connector's tools this to-do uses, picked from its tool list so the task matches what the connector can do"),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional().describe('1 = high, 3 = low; only when stated'),
  categoryId: uuid.optional().describe('Life area (resolved with find_categories); default Other'),
  projectId: uuid.nullable().optional().describe('Work project (resolved with find_projects)'),
  tagIds: z.array(uuid).max(20).optional().describe('Tags (resolved with find_tags)'),
  date: localDate.nullable().optional().describe('The day the task belongs to, YYYY-MM-DD'),
  dueAt: z.string().datetime({ offset: true }).nullable().optional().describe('Due moment when a time is given, ISO date-time with offset'),
  remindAt: z.string().datetime({ offset: true }).optional().describe('When to remind (adds one reminder); only when the user asks to be reminded'),
  pending: z.boolean().optional().describe('Show it every day from its date until done'),
  parentId: uuid.nullable().optional().describe('The parent task when this is a thread (resolved with find_items)'),
  recurrence: recurrenceSchema.nullable().optional().describe('How a periodic task repeats; omit for a single task'),
  startsOn: localDate.optional().describe('Periodic task: first day, YYYY-MM-DD; default today'),
  endsOn: localDate.nullable().optional().describe('Periodic task: last day, YYYY-MM-DD'),
  evaluation: z.enum(ITEM_EVALUATIONS).optional().describe('Periodic task: yes_no or checklist (done when all lines are ticked)'),
  subtasksOrder: z.enum(SUBTASKS_ORDERS).optional().describe('Threads: any order, or sequential (one after another)'),
  checklist: checklistInputSchema.optional(),
  reminders: z.array(reminderInputSchema).max(10).optional().describe('Reminders; on update the list replaces the current one'),
  source: z.object({ client: z.string().optional().describe('Client, e.g. mia'), chatId: z.string().optional().describe('Chat id'), messageId: z.string().optional().describe('Message id') }).strict().optional().describe('Where the item came from'),
};

export const createItemSchema = z.object(itemFields).strict();
export const updateItemSchema = z
  .object({ id: uuid.describe('The item (resolved with find_items)'), ...itemFields })
  .partial()
  .required({ id: true })
  .strict();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const findManyItemsSchema = z
  .object({
    type: z.enum(ITEM_TYPES).optional().describe('Only this type'),
    status: z.enum(ITEM_STATUSES).optional().describe('Only this status'),
    open: z.coerce.boolean().optional().describe('Only items not done / archived'),
    categoryId: uuid.optional().describe('Only this category'),
    projectId: uuid.optional().describe('Only this project'),
    parentId: uuid.optional().describe('Threads of this parent'),
    assignee: assignee.optional().describe("Only items assigned to: me, or an agent's slug"),
    createdBy: assignee.optional().describe("Only items made by: me, or an agent's slug"),
    periodic: z.coerce.boolean().optional().describe('true = periodic tasks only, false = single only'),
    search: z.string().max(200).optional().describe('Words in the title, or #123'),
    limit: z.coerce.number().int().min(1).max(200).default(50).describe('Page size'),
    offset: z.coerce.number().int().min(0).default(0).describe('Page offset'),
  })
  .strict();
export type FindManyItemsQuery = z.infer<typeof findManyItemsSchema>;

const occurrenceTarget = {
  id: uuid.describe('The item'),
  date: localDate.optional().describe('Periodic task: the scheduled day, YYYY-MM-DD; default today'),
  slot: z.number().int().min(0).max(23).optional().describe('Hourly periodic task: the hour'),
};

export const completeItemSchema = z.object(occurrenceTarget).strict();
export const skipOccurrenceSchema = z.object({ ...occurrenceTarget, note: z.string().max(500).optional().describe('Why') }).strict();
export const moveOccurrenceSchema = z.object({ ...occurrenceTarget, date: localDate.describe('The scheduled day'), toDate: localDate.describe('The new day') }).strict();
export const splitTaskSchema = z
  .object({
    id: uuid.describe('The task to split'),
    order: z.enum(SUBTASKS_ORDERS).describe('any = threads in any order; sequential = one after another'),
    threads: z
      .array(
        z
          .object({
            title: z.string().min(1).max(200).describe('Thread title'),
            date: localDate.optional().describe('Thread day'),
            checklist: checklistInputSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .describe('Threads in order'),
  })
  .strict();
export const reorderItemsSchema = z.object({ parentId: uuid.nullable().optional().describe('Parent of the reordered threads'), ids: z.array(uuid).min(1).describe('Ids in the new order') }).strict();
export const addNoteSchema = z.object({ id: uuid.describe('The item'), text: z.string().min(1).max(5000).describe('Text to append') }).strict();

export type CompleteItemInput = z.infer<typeof completeItemSchema>;
export type SkipOccurrenceInput = z.infer<typeof skipOccurrenceSchema>;
export type MoveOccurrenceInput = z.infer<typeof moveOccurrenceSchema>;
export type SplitTaskInput = z.infer<typeof splitTaskSchema>;
export type OccurrenceStatusValue = (typeof OCCURRENCE_STATUSES)[number];
