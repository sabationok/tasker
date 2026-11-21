import { z } from 'zod';
import type { ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const ownItemId = z.string().uuid().describe('One of your assignments (an item_id from my_assignments)');
/** A write on the caller's own item: the server refuses any other item, so the hub runs it without a card. */
const selfWrite = { readOnlyHint: false, destructiveHint: false } as const;

/** The calling agent's own to-dos (items with `assignee` = its slug). */
export const assignmentTools = (d: ToolDeps): ToolDef[] => [
  {
    name: 'my_assignments',
    description: 'Your own open to-dos (items assigned to you, the calling agent): doing first, then by day. The body holds the instructions.',
    input: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    meta: { actions: ['read'], keywords: ['мої задачі', 'що мені робити', 'my tasks', 'assignments'], schemaVersion: 1 },
    run: async (_i, ctx) => ({ items: await d.assignments.mine(ctx) }),
  },
  {
    name: 'claim_assignment',
    description: 'Take one of your assignments: marks it doing. Without item_id, takes the oldest actionable one. Returns null when none is left.',
    input: z.object({ itemId: ownItemId.optional() }).strict(),
    annotations: selfWrite,
    meta: { actions: ['update'], keywords: ['візьми задачу', 'наступна задача', 'next task', 'claim'], schemaVersion: 1, selfScoped: true },
    noDraft: true,
    check: (i, ctx) => d.assignments.checkOwn(i.itemId, ctx),
    run: async (i, ctx) => ({ item: await d.assignments.claim(i.itemId, ctx) }),
  },
  {
    name: 'complete_assignment',
    description: 'Finish one of your assignments; a periodic one (a regular check) closes only for today. Put what you did or found in result: the user reads it.',
    input: z.object({ itemId: ownItemId, result: z.string().max(4000).optional().describe('What was done, for the user') }).strict(),
    annotations: { ...selfWrite, idempotentHint: true },
    meta: { actions: ['update'], keywords: ['зробив', 'готово', 'done', 'finished'], schemaVersion: 1, selfScoped: true },
    noDraft: true,
    check: (i, ctx) => d.assignments.checkOwn(i.itemId, ctx),
    run: async (i, ctx) => ({ item: await d.assignments.complete(i.itemId, i.result, ctx) }),
  },
  {
    name: 'defer_assignment',
    description: 'Put off one of your assignments: back to todo, to another day or due moment when given; a periodic one moves (or, with no date, skips) only today. Say why in note.',
    input: z
      .object({
        itemId: ownItemId,
        date: localDate.nullable().optional().describe('The new day, YYYY-MM-DD; null = no day'),
        dueAt: z.string().datetime({ offset: true }).nullable().optional().describe('The new due moment, ISO date-time with offset'),
        note: z.string().max(1000).optional().describe('Why it is put off, for the user'),
      })
      .strict(),
    annotations: selfWrite,
    meta: { actions: ['update'], keywords: ['відклади', 'пізніше', 'defer', 'later'], schemaVersion: 1, selfScoped: true },
    noDraft: true,
    check: (i, ctx) => d.assignments.checkOwn(i.itemId, ctx),
    run: async (i, ctx) => ({ item: await d.assignments.defer(i, ctx) }),
  },
];
