import { z } from 'zod';
import { checkInSchema, createHabitSchema, updateHabitSchema } from '../../habits/dto/habit.schemas';
import { msg } from '../../common/i18n/messages';
import { describeRecurrence } from '../../recurrence/helpers/describe-recurrence';
import type { ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const habitId = z.string().uuid().describe('The habit (resolved with find_habits)');
const write = { readOnlyHint: false, destructiveHint: false } as const;
const updateInput = updateHabitSchema.omit({ id: true }).extend({ habitId }).strict();

export const habitTools = (d: ToolDeps): ToolDef[] => [
  {
    name: 'create_habit',
    description: 'Create a habit: yes/no, a number, a checklist, a timer or a stopwatch, with a repetition and goals.',
    input: createHabitSchema,
    annotations: write,
    meta: { actions: ['create'], keywords: ['звичка', 'щодня пити', 'привчитись', 'habit', 'track'], lookup: { category_id: 'find_categories' }, schemaVersion: 1 },
    check: (i, ctx) => d.habits.checkCreate(i, ctx),
    preview: async (i, ctx) => {
      const p = await d.preview.build({ categoryId: i.categoryId, recurrence: i.recurrence, reminders: i.reminders }, ctx);
      if (i.targetValue !== undefined && i.targetValue !== null) p.computed.target = `${i.targetCondition === 'at_most' ? '≤' : i.targetCondition === 'exactly' ? '=' : '≥'} ${i.targetValue}${i.unit ? ` ${i.unit}` : ''}`;
      return p;
    },
    run: async (i, ctx) => ({ habit: await d.habits.create(i, ctx) }),
  },
  {
    name: 'update_habit',
    description: 'Change a habit: name, target, repetition, goals, reminders, notes.',
    input: updateInput,
    annotations: write,
    meta: { actions: ['update'], keywords: ['зміни звичку', 'update habit'], lookup: { habit_id: 'find_habits', category_id: 'find_categories' }, schemaVersion: 1 },
    check: ({ habitId: id, ...rest }, ctx) => d.habits.checkUpdate({ id, ...rest }, ctx),
    preview: async ({ habitId: id, ...rest }, ctx) => d.preview.build({ habitId: id, categoryId: rest.categoryId, recurrence: rest.recurrence, reminders: rest.reminders }, ctx),
    run: async ({ habitId: id, ...rest }, ctx) => ({ habit: await d.habits.update({ id, ...rest }, ctx) }),
  },
  {
    name: 'check_in_habit',
    description: "Log a habit's result for a day: done, a value, ticked sub-items, seconds, or skipped / failed.",
    input: checkInSchema,
    annotations: write,
    meta: { actions: ['update'], keywords: ['випив', 'зробив', 'відміть', 'пробіг', 'check in', 'log'], lookup: { habit_id: 'find_habits' }, schemaVersion: 1 },
    check: (i, ctx) => d.checkins.check(i, ctx),
    preview: async (i, ctx) => {
      const p = await d.preview.build({ habitId: i.habitId, date: i.date }, ctx);
      const h = await d.habits.get(i.habitId);
      p.computed.recurrence = describeRecurrence(h.recurrence, ctx.locale);
      if (i.value !== undefined) p.computed.value = `${i.value}${h.unit ? ` ${h.unit}` : ''}${h.targetValue !== null ? ` / ${h.targetValue}` : ''}`;
      return p;
    },
    run: async (i, ctx) => ({ checkin: await d.checkins.checkIn(i, ctx) }),
  },
  {
    name: 'archive_habit',
    description: 'Archive a habit (its log stays) or restore it.',
    input: z.object({ habitId, archived: z.boolean().default(true).describe('true = archive, false = restore') }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    meta: { actions: ['update'], keywords: ['архівуй', 'зупини звичку', 'archive'], lookup: { habit_id: 'find_habits' }, schemaVersion: 1 },
    check: async (i, ctx) => ((await d.habits.getOrFail(i.habitId, true).catch(() => null)) ? [] : [{ path: 'habitId', code: 'not-found:habit', message: msg(ctx.locale, 'not-found:habit') }]),
    preview: (i, ctx) => d.preview.build({ habitId: i.habitId }, ctx),
    run: async (i) => ({ habit: await d.habits.archive(i.habitId, i.archived) }),
  },
];
