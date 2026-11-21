import { z } from 'zod';

export const createTagSchema = z.object({ name: z.string().min(1).max(50).describe('Tag name') }).strict();
export const updateTagSchema = z.object({ id: z.string().uuid().describe('The tag'), name: z.string().min(1).max(50).describe('New name') }).strict();

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
