import { createCategorySchema } from '../../categories/dto/category.schemas';
import { createProjectSchema } from '../../projects/dto/project.schemas';
import { updateSettingsSchema } from '../../settings/dto/update-settings.schema';
import type { ToolDef } from '../types/tool.types';
import type { ToolDeps } from './tool-deps';

const write = { readOnlyHint: false, destructiveHint: false } as const;
const noRefs = async () => ({ refs: {}, computed: {}, warnings: [] });

export const catalogTools = (d: ToolDeps): ToolDef[] => [
  {
    name: 'create_category',
    description: 'Create a category (a life area with an icon and a colour).',
    input: createCategorySchema,
    annotations: write,
    meta: { actions: ['create'], keywords: ['нова категорія', 'category'], schemaVersion: 1 },
    check: async () => [],
    preview: noRefs,
    run: async (i) => ({ category: await d.categories.create(i) }),
  },
  {
    name: 'create_project',
    description: 'Create a project (a work context for tasks).',
    input: createProjectSchema,
    annotations: write,
    meta: { actions: ['create'], keywords: ['новий проєкт', 'project'], schemaVersion: 1 },
    check: async () => [],
    preview: noRefs,
    run: async (i) => ({ project: await d.projects.create(i) }),
  },
  {
    name: 'update_settings',
    description: "Change the owner's settings: time zone, language, week start, how failed days are counted.",
    input: updateSettingsSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    meta: { actions: ['update'], keywords: ['налаштування', 'settings'], schemaVersion: 1 },
    noDraft: true,
    run: async (i) => {
      const { toolsSchemaHash: _, uiManifestVersion: __, ...settings } = await d.settings.update(i);
      return { settings };
    },
  },
];
