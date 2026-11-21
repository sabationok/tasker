import { z } from 'zod';
import type { RequestCtx } from '../../common/context/request-context';
import type { FieldError } from '../../common/http/error-codes';
import { AppException } from '../../common/http/app-exception';
import { msg } from '../../common/i18n/messages';
import { checklistInputSchema, createItemSchema, splitTaskSchema, updateItemSchema } from '../../items/dto/item.schemas';
import type { Preview, ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const uuid = z.string().uuid();
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const itemId = uuid.describe('The item (resolved with find_items by its title or #number)');
const write = { readOnlyHint: false, destructiveHint: false } as const;
const idem = { readOnlyHint: false, destructiveHint: false, idempotentHint: true } as const;
const itemLookups = { project_id: 'find_projects', category_id: 'find_categories', tag_ids: 'find_tags', parent_id: 'find_items', assignee: 'find_agents' };

const occurrenceInput = z
  .object({
    itemId,
    date: localDate.optional().describe('Periodic task: the scheduled day (a moved one: its occurrence_date from get_today), YYYY-MM-DD; default today'),
    slot: z.number().int().min(0).max(23).optional().describe('Hourly periodic task: the hour'),
  })
  .strict();

const updateInput = updateItemSchema.omit({ id: true }).extend({ itemId }).strict();
const toggleInput = z
  .object({
    itemId,
    lineId: uuid.optional().describe('The checklist line id (from get_item)'),
    title: z.string().max(200).optional().describe('Or the line text, when the id is unknown'),
    date: localDate.optional().describe('Periodic task: the day; default today'),
    slot: z.number().int().min(0).max(23).optional().describe('Hourly periodic task: the hour'),
  })
  .strict();
const splitInput = splitTaskSchema.omit({ id: true }).extend({ itemId }).strict();

export const itemTools = (d: ToolDeps): ToolDef[] => {
  const itemPreview = async (itemIdValue: string, ctx: RequestCtx, extra: Partial<Preview['computed']> = {}): Promise<Preview> => {
    const p = await d.preview.build({ itemId: itemIdValue }, ctx);
    return { ...p, computed: { ...p.computed, ...(extra as Record<string, string>) } };
  };
  /** Resolves a checklist line by id or by text; several matches → options. */
  const resolveLine = async (i: z.infer<typeof toggleInput>, ctx: RequestCtx): Promise<{ id?: string; errors: FieldError[] }> => {
    if (i.lineId) return { id: i.lineId, errors: [] };
    if (!i.title) return { errors: [{ path: 'lineId', code: 'invalid:args', message: 'Give lineId or title' }] };
    const found = await d.checklist.findByTitle(i.itemId, i.title);
    if (found.length === 1) return { id: found[0].id, errors: [] };
    return { errors: [{ path: 'title', code: 'not-found:checklist-item', message: msg(ctx.locale, 'not-found:checklist-item'), ...(found.length > 1 && { options: found.map((f) => ({ id: f.id, label: f.title })) }) }] };
  };
  return [
    {
      name: 'create_item',
      description: 'Create a task (single, periodic or a thread of a task), an idea or a note; reminders are tasks with remind_at.',
      input: createItemSchema,
      annotations: write,
      meta: { actions: ['create'], keywords: ['задача', 'ідея', 'нотатка', 'нагадай', 'запиши', 'додай', 'щодня', 'щотижня', 'todo', 'remind', 'idea', 'note'], lookup: itemLookups, schemaVersion: 1 },
      check: (i, ctx) => d.items.checkCreate(i, ctx),
      preview: (i, ctx) => d.preview.build(i, ctx, { similarTo: i.title }),
      run: async (i, ctx) => ({ item: await d.items.create(i, ctx) }),
    },
    {
      name: 'update_item',
      description: 'Change a task, idea or note: title, date, category, project, priority, checklist, reminders, repetition.',
      input: updateInput,
      annotations: write,
      meta: { actions: ['update'], keywords: ['зміни', 'перенеси', 'онови', 'update', 'change'], lookup: { item_id: 'find_items', ...itemLookups }, schemaVersion: 1 },
      check: ({ itemId: id, ...rest }, ctx) => d.items.checkUpdate({ id, ...rest }, ctx),
      preview: async ({ itemId: id, ...rest }, ctx) => d.preview.build({ ...rest, itemId: id }, ctx),
      run: async ({ itemId: id, ...rest }, ctx) => ({ item: await d.items.update({ id, ...rest }, ctx) }),
    },
    {
      name: 'complete_item',
      description: 'Mark a task done (for a periodic task: one day of it). Completing a task with threads completes them too.',
      input: occurrenceInput,
      annotations: idem,
      meta: { actions: ['update'], keywords: ['виконано', 'зроблено', 'готово', 'закрий', 'done', 'complete'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: ({ itemId: id, ...rest }, ctx) => d.occurrences.check({ id, ...rest }, ctx),
      preview: (i, ctx) => itemPreview(i.itemId, ctx, i.date ? { day: i.date } : {}),
      run: async ({ itemId: id, ...rest }, ctx) => ({ item: await d.occurrences.complete({ id, ...rest }, ctx) }),
    },
    {
      name: 'uncomplete_item',
      description: 'Re-open a done task (for a periodic task: one day of it).',
      input: occurrenceInput,
      annotations: idem,
      meta: { actions: ['update'], keywords: ['не виконано', 'відкрий знову', 'reopen', 'undo done'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: async (i, ctx) => ((await d.items.getOrFail(i.itemId).catch(() => null)) ? [] : [{ path: 'itemId', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }]),
      preview: (i, ctx) => itemPreview(i.itemId, ctx),
      run: async ({ itemId: id, ...rest }, ctx) => ({ item: await d.occurrences.uncomplete({ id, ...rest }, ctx) }),
    },
    {
      name: 'skip_occurrence',
      description: 'Skip one day of a periodic task (counts as skipped, not failed).',
      input: occurrenceInput.extend({ note: z.string().max(500).optional().describe('Why it is skipped') }).strict(),
      annotations: write,
      meta: { actions: ['update'], keywords: ['пропусти', 'пропускаю', 'skip'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: ({ itemId: id, ...rest }, ctx) => d.occurrences.check({ id, ...rest }, ctx, true),
      preview: (i, ctx) => itemPreview(i.itemId, ctx),
      run: async ({ itemId: id, ...rest }, ctx) => ({ item: await d.occurrences.skip({ id, ...rest }, ctx) }),
    },
    {
      name: 'move_occurrence',
      description: 'Move one day of a periodic task to another day.',
      input: z.object({ itemId, date: localDate.describe('The scheduled day, YYYY-MM-DD'), toDate: localDate.describe('The new day, YYYY-MM-DD'), slot: z.number().int().min(0).max(23).optional().describe('Hourly: the hour') }).strict(),
      annotations: write,
      meta: { actions: ['update'], keywords: ['перенеси на', 'move'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: ({ itemId: id, ...rest }, ctx) => d.occurrences.checkMove({ id, ...rest }, ctx),
      preview: (i, ctx) => itemPreview(i.itemId, ctx, { moved: `${i.date} → ${i.toDate}` }),
      run: async ({ itemId: id, ...rest }, ctx) => ({ item: await d.occurrences.move({ id, ...rest }, ctx) }),
    },
    {
      name: 'toggle_checklist_item',
      description: "Tick or untick a line of a task's checklist (by id or by its text).",
      input: toggleInput,
      annotations: idem,
      meta: { actions: ['update'], keywords: ['відміть пункт', 'чекліст', 'checklist', 'tick'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: async (i, ctx) => {
        if (!(await d.items.getOrFail(i.itemId).catch(() => null))) return [{ path: 'itemId', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }];
        return (await resolveLine(i, ctx)).errors;
      },
      preview: async (i, ctx) => itemPreview(i.itemId, ctx, { line: i.title ?? i.lineId ?? '' }),
      run: async (i, ctx) => {
        const { id, errors } = await resolveLine(i, ctx);
        if (errors.length || !id) throw AppException.invalid(errors);
        return { item: await d.occurrences.toggleChecklistLine(id, ctx, i.date, i.slot) };
      },
    },
    {
      name: 'split_task',
      description: 'Split a task into threads, done in any order or one after another.',
      input: splitInput,
      annotations: write,
      meta: { actions: ['update'], keywords: ['розбий', 'поділи', 'кроки', 'потоки', 'split', 'steps'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: ({ itemId: id, ...rest }, ctx) => d.threads.checkSplit({ id, ...rest }, ctx),
      preview: async (i, ctx) => itemPreview(i.itemId, ctx, { threads: `${i.threads.length} (${i.order === 'sequential' ? (ctx.locale === 'uk' ? 'послідовно' : 'sequential') : ctx.locale === 'uk' ? 'у будь-якому порядку' : 'any order'})` }),
      run: async ({ itemId: id, ...rest }, ctx) => {
        await d.threads.split({ id, ...rest }, ctx);
        return { item: await d.items.get(id) };
      },
    },
    {
      name: 'add_note',
      description: "Append text to an item's description.",
      input: z.object({ itemId, text: z.string().min(1).max(5000).describe('Text to append') }).strict(),
      annotations: write,
      meta: { actions: ['update'], keywords: ['допиши', 'додай нотатку', 'append', 'note'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: async (i, ctx) => ((await d.items.getOrFail(i.itemId).catch(() => null)) ? [] : [{ path: 'itemId', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }]),
      preview: (i, ctx) => itemPreview(i.itemId, ctx),
      run: async (i) => ({ item: await d.items.addNote(i.itemId, i.text) }),
    },
    {
      name: 'delete_item',
      description: 'Delete a task, idea or note (with its threads).',
      input: z.object({ itemId }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true },
      meta: { actions: ['delete'], keywords: ['видали', 'delete', 'remove'], lookup: { item_id: 'find_items' }, schemaVersion: 1 },
      check: async (i, ctx) => ((await d.items.getOrFail(i.itemId).catch(() => null)) ? [] : [{ path: 'itemId', code: 'not-found:item', message: msg(ctx.locale, 'not-found:item') }]),
      preview: async (i, ctx) => {
        const item = await d.items.get(i.itemId);
        return itemPreview(i.itemId, ctx, { deletes: `#${item.shortId} ${item.title}${item.threads ? ` + ${item.threads.total}` : ''}` });
      },
      run: async (i) => ({ ...(await d.items.delete(i.itemId)) }),
    },
  ];
};

export { checklistInputSchema };
