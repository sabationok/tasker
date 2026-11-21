import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

/** How a periodic task or a habit repeats (spec §6.2). Stored as jsonb, camelCase. */
export const recurrenceSchema = z
  .discriminatedUnion(
    'freq',
    [
      z
        .object({
          freq: z.literal('hourly').describe('Every few hours within a time window, every day'),
          everyHours: z.number().int().min(1).max(12).default(1).describe('Hours between slots, 1–12'),
          from: hhmm.default('08:00').describe('First slot, HH:mm local'),
          to: hhmm.default('20:00').describe('Last slot not later than, HH:mm local'),
        })
        .strict(),
      z.object({ freq: z.literal('daily').describe('Every day') }).strict(),
      z
        .object({
          freq: z.literal('weekly').describe('On some weekdays'),
          weekdays: z.array(z.number().int().min(1).max(7)).min(1).describe('ISO weekdays: 1 = Monday … 7 = Sunday'),
        })
        .strict(),
      z
        .object({
          freq: z.literal('monthly').describe('On some days of each month'),
          monthDays: z.array(z.number().int().min(1).max(31)).min(1).describe('Days of month 1–31; 31 means the last day in shorter months'),
        })
        .strict(),
      z
        .object({
          freq: z.literal('every_n_days').describe('Every N days from the start date'),
          interval: z.number().int().min(2).max(365).describe('N, at least 2'),
        })
        .strict(),
      z
        .object({
          freq: z.literal('days_per_period').describe('Some days per week or month, any days'),
          count: z.number().int().min(1).max(31).describe('How many days per period'),
          period: z.enum(['week', 'month']).describe('The period'),
        })
        .strict(),
      z
        .object({
          freq: z.literal('yearly_dates').describe('Specific days of the year'),
          dates: z.array(z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Use MM-DD')).min(1).describe('Dates as MM-DD'),
        })
        .strict(),
    ],
    { errorMap: () => ({ message: 'Unknown frequency' }) },
  )
  .describe('How it repeats');

export type Recurrence = z.infer<typeof recurrenceSchema>;
export type Freq = Recurrence['freq'];
