import { z } from 'zod';
import { findManyHabitsSchema } from '../../habits/dto/habit.schemas';
import { findManyItemsSchema } from '../../items/dto/item.schemas';
import { statsQuerySchema } from '../../stats/stats.controller';
import type { ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const read = { readOnlyHint: true, destructiveHint: false } as const;
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const readTools = (d: ToolDeps): ToolDef[] => [
  {
    name: 'get_today',
    description: "Show a day's plan: tasks, periodic tasks and habits with progress (default today).",
    input: z.object({ date: localDate.optional().describe('The day, YYYY-MM-DD; default today'), categoryId: z.string().uuid().optional().describe('Only this category (resolved with find_categories)') }).strict(),
    annotations: read,
    meta: { actions: ['read'], keywords: ['сьогодні', 'план', 'що на сьогодні', 'today'], lookup: { category_id: 'find_categories' }, schemaVersion: 1 },
    run: async (i, ctx) => ({ ...(await d.today.get(i.date, ctx, i.categoryId)) }),
  },
  {
    name: 'get_item',
    description: 'Get one task, idea or note with its checklist, reminders and threads.',
    input: z.object({ itemId: z.string().uuid().describe('The item (resolved with find_items)') }).strict(),
    annotations: read,
    meta: { actions: ['read'], keywords: ['покажи задачу', 'деталі', 'details'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
    run: async (i) => ({ item: await d.items.get(i.itemId) }),
  },
  {
    name: 'list_items',
    description: 'List tasks, ideas or notes by type, status, category, project or words.',
    input: findManyItemsSchema,
    annotations: read,
    meta: { actions: ['read'], keywords: ['список', 'ідеї', 'нотатки', 'задачі', 'list'], lookup: { project_id: 'find_projects', category_id: 'find_categories', parent_id: 'find_items' }, schemaVersion: 1 },
    run: async (i) => ({ ...(await d.items.findMany(i)) }),
  },
  {
    name: 'get_habit',
    description: 'Get one habit with its target, goals and reminders.',
    input: z.object({ habitId: z.string().uuid().describe('The habit (resolved with find_habits)') }).strict(),
    annotations: read,
    meta: { actions: ['read'], keywords: ['звичка', 'habit'], lookup: { habit_id: 'find_habits' }, schemaVersion: 1 },
    run: async (i) => ({ habit: await d.habits.get(i.habitId) }),
  },
  {
    name: 'list_habits',
    description: 'List active or archived habits.',
    input: findManyHabitsSchema,
    annotations: read,
    meta: { actions: ['read'], keywords: ['звички', 'habits'], lookup: { category_id: 'find_categories' }, schemaVersion: 1 },
    run: async (i) => ({ ...(await d.habits.findMany(i)) }),
  },
  {
    name: 'get_stats',
    description: 'Statistics for a week, month, year or all time: success rate, completed / skipped / failed, by day.',
    input: statsQuerySchema,
    annotations: read,
    meta: { actions: ['read'], keywords: ['статистика', 'прогрес', 'успішність', 'stats'], schemaVersion: 1 },
    run: async (i, ctx) => ({ ...(await d.stats.get(i, ctx)) }),
  },
  {
    name: 'next_task',
    description: "Take the next task assigned to an agent (owner claude): marks it doing and returns it.",
    input: z.object({}).strict(),
    annotations: read,
    meta: { actions: ['read'], keywords: ['наступна задача', 'next task'], schemaVersion: 1 },
    run: async () => ({ item: await d.items.nextTask() }),
  },
];
