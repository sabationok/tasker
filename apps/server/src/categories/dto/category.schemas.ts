import { z } from 'zod';

export const createCategorySchema = z
  .object({
    name: z.string().min(1).max(60).describe('Category name, e.g. Health'),
    icon: z.string().min(1).max(40).default('grid').describe('Icon name'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#8B8D98').describe('Colour as #RRGGBB'),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    id: z.string().uuid().describe('The category'),
    name: z.string().min(1).max(60).optional().describe('New name'),
    icon: z.string().min(1).max(40).optional().describe('New icon'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('New colour'),
    archived: z.boolean().optional().describe('Archive or restore'),
  })
  .strict();

export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).describe('Ids in the new order') }).strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
