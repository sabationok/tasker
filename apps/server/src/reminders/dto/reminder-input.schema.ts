import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

/** One reminder: an absolute moment (single tasks), a time of day (periodic tasks, habits) or minutes before `dueAt`. */
export const reminderInputSchema = z.union([
  z.object({ at: z.string().datetime({ offset: true }).describe('When to remind, ISO date-time with offset') }).strict(),
  z.object({ timeOfDay: hhmm.describe('Each scheduled day at this local time, HH:mm') }).strict(),
  z.object({ offsetMin: z.number().int().min(0).max(10080).describe("Minutes before the item's due time") }).strict(),
]);

export type ReminderInput = z.infer<typeof reminderInputSchema>;

export const createReminderSchema = z
  .object({
    itemId: z.string().uuid().optional().describe('The item (one of itemId / habitId)'),
    habitId: z.string().uuid().optional().describe('The habit (one of itemId / habitId)'),
    at: z.string().datetime({ offset: true }).optional().describe('Absolute moment'),
    timeOfDay: hhmm.optional().describe('Local time each scheduled day'),
    offsetMin: z.number().int().min(0).max(10080).optional().describe("Minutes before the item's due time"),
  })
  .strict()
  .refine((v) => Boolean(v.itemId) !== Boolean(v.habitId), { message: 'Give exactly one of itemId / habitId', path: ['itemId'] })
  .refine((v) => [v.at, v.timeOfDay, v.offsetMin].filter((x) => x !== undefined).length === 1, { message: 'Give exactly one of at / timeOfDay / offsetMin', path: ['at'] });

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
