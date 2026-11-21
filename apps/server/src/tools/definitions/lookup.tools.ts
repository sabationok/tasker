import { z } from 'zod';
import type { ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const lookupInput = z
  .object({
    query: z.string().max(200).default('').describe('What the user said; empty lists the first ones'),
    limit: z.number().int().min(1).max(50).default(10).describe('How many results'),
  })
  .strict();

const lookup = (name: string, description: string, keywords: string[], find: (q: string, limit: number) => Promise<unknown>): ToolDef<z.infer<typeof lookupInput>> => ({
  name,
  description,
  input: lookupInput,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  meta: { actions: ['read'], keywords, lookupArg: 'query', schemaVersion: 1 },
  run: async (i) => ({ results: await find(i.query, i.limit) }),
});

export const lookupTools = (d: ToolDeps): ToolDef[] => [
  lookup('find_projects', 'Find projects by name (a lookup for project_id).', ['проєкт', 'проект', 'project'], (q, l) => d.projects.lookup(q, l)),
  lookup('find_categories', 'Find categories (life areas: Health, Work, …) by name (a lookup for category_id).', ['категорія', 'сфера', 'category'], (q, l) => d.categories.lookup(q, l)),
  lookup('find_tags', 'Find tags by name (a lookup for tag_ids).', ['тег', 'мітка', 'tag'], (q, l) => d.tags.lookup(q, l)),
  lookup('find_items', 'Find open tasks, ideas and notes by #number or title words (a lookup for item_id / parent_id).', ['задача', 'запис', '#', 'task', 'item'], (q, l) => d.items.lookup(q, l)),
  lookup('find_agents', 'Find who an item can be assigned to: me (the user) or an agent (a lookup for assignee; id = the slug).', ['агент', 'виконавець', 'кому', 'agent', 'assignee'], (q, l) => d.agents.lookup(q, l)),
  lookup('find_habits', 'Find active habits by name (a lookup for habit_id).', ['звичка', 'habit'], (q, l) => d.habits.lookup(q, l)),
];
