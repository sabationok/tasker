import { s, type JsonSchema } from '@/lib/page-agent';

/** Shared input schemas of the task and habit forms' page tools (the domain shapes from contracts/tasker.ts). */

const time = s.str('HH:mm', { format: 'time' });

/** Recurrence, as the form's recurrence editor stores it. Weekdays 1 = Monday … 7 = Sunday. */
export const recurrenceSchema: JsonSchema = {
  description: 'How often it repeats',
  anyOf: [
    s.obj({ freq: s.enumOf(['daily']) }, ['freq']),
    s.obj({ freq: s.enumOf(['weekly']), weekdays: s.arr(s.int(undefined, { minimum: 1, maximum: 7 }), '1 = Monday … 7 = Sunday', 7) }, ['freq', 'weekdays']),
    s.obj({ freq: s.enumOf(['monthly']), monthDays: s.arr(s.int(undefined, { minimum: 1, maximum: 31 }), 'Days of the month', 31) }, ['freq', 'monthDays']),
    s.obj({ freq: s.enumOf(['every_n_days']), interval: s.int('Every N days', { minimum: 1, maximum: 365 }) }, ['freq', 'interval']),
    s.obj({ freq: s.enumOf(['days_per_period']), count: s.int('Times per period', { minimum: 1, maximum: 31 }), period: s.enumOf(['week', 'month']) }, ['freq', 'count', 'period']),
    s.obj({ freq: s.enumOf(['hourly']), everyHours: s.int('Every N hours', { minimum: 1, maximum: 23 }), from: time, to: time }, ['freq', 'everyHours', 'from', 'to']),
    s.obj({ freq: s.enumOf(['yearly_dates']), dates: s.arr(s.str('MM-DD'), 'Dates of the year', 50) }, ['freq', 'dates']),
  ],
};

/** 0 = default (none), 1 = high, 2 = medium, 3 = low. */
export const prioritySchema: JsonSchema = s.int('0 default, 1 high, 2 medium, 3 low', { enum: [0, 1, 2, 3] });

export const checklistAddSchema = s.obj({ titles: s.arr(s.str(undefined, { maxLength: 200 }), 'Lines to add, in order', 50) }, ['titles']);
export const checklistRemoveSchema = s.obj({ position: s.int('0-based position in sections.values.checklist', { minimum: 0 }) }, ['position']);
