import { z } from 'zod';
import { recurrenceSchema } from '../../recurrence/recurrence.schema';
import { HABIT_EVALUATIONS, HABIT_STATUSES, TARGET_CONDITIONS } from '../types/habit.types';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
const goal = z.object({ value: z.number().positive().describe('Target for the window'), metric: z.enum(['days', 'sum']).describe('days = done days; sum = sum of values') }).strict();

const habitFields = {
  name: z.string().min(1).max(200).describe("Habit name in the user's words"),
  description: z.string().max(5000).nullable().optional().describe('Longer description'),
  categoryId: z.string().uuid().optional().describe('Life area (resolved with find_categories); default Other'),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional().describe('1 = high, 3 = low'),
  evaluation: z.enum(HABIT_EVALUATIONS).describe('yes_no; numeric (a value vs a target); checklist (sub-items); timer (seconds vs a target); stopwatch (sessions summed)'),
  targetValue: z.number().nonnegative().nullable().optional().describe('Daily target: a number for numeric, seconds for timer / stopwatch'),
  targetCondition: z.enum(TARGET_CONDITIONS).nullable().optional().describe('numeric: at_least, at_most or exactly'),
  unit: z.string().max(30).nullable().optional().describe('numeric: unit, e.g. склянок, km'),
  checklist: z.array(z.object({ id: z.string().uuid().optional().describe('Existing line to keep'), title: z.string().min(1).max(200).describe('Line text') }).strict()).max(50).optional().describe('checklist: the sub-items, in order'),
  checklistMin: z.number().int().min(1).nullable().optional().describe('checklist: how many sub-items make the day done; default all'),
  recurrence: recurrenceSchema,
  startsOn: localDate.optional().describe('First day, YYYY-MM-DD; default today'),
  endsOn: localDate.nullable().optional().describe('Last day, YYYY-MM-DD'),
  goals: z
    .object({ weekly: goal.optional().describe('Goal per week'), monthly: goal.optional().describe('Goal per month'), yearly: goal.optional().describe('Goal per year'), allTime: goal.optional().describe('Goal for all time') })
    .strict()
    .optional()
    .describe('Extra goals per window'),
  notesEnabled: z.boolean().optional().describe('Allow a note on each check-in'),
  reminders: z.array(z.object({ timeOfDay: hhmm.describe('Local time, HH:mm') }).strict()).max(10).optional().describe('Daily reminders on scheduled days'),
};

export const createHabitSchema = z.object(habitFields).strict();
export const updateHabitSchema = z.object({ id: z.string().uuid().describe('The habit (resolved with find_habits)'), ...habitFields }).partial().required({ id: true }).strict();

export const checkInSchema = z
  .object({
    habitId: z.string().uuid().describe('The habit (resolved with find_habits)'),
    date: localDate.optional().describe('The day, YYYY-MM-DD; default today'),
    slot: z.number().int().min(0).max(23).optional().describe('Hourly habit: the hour'),
    value: z.number().nonnegative().optional().describe('numeric: the value; timer / stopwatch: seconds (stopwatch adds to the day)'),
    checklistDone: z.array(z.string().uuid()).optional().describe('checklist: ids of the ticked sub-items (replaces the day’s list)'),
    note: z.string().max(2000).optional().describe('A note, when notes are on'),
    status: z.enum(['done', 'skipped', 'failed', 'none']).optional().describe('Explicit result; none clears the day'),
  })
  .strict();

export const findManyHabitsSchema = z
  .object({
    status: z.enum(HABIT_STATUSES).default('active').describe('active or archived'),
    categoryId: z.string().uuid().optional().describe('Only this category'),
    search: z.string().max(200).optional().describe('Words in the name'),
  })
  .strict();

export const checkinsQuerySchema = z.object({ habitId: z.string().uuid(), from: localDate, to: localDate }).strict();

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type FindManyHabitsQuery = z.infer<typeof findManyHabitsSchema>;
