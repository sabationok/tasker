import { z } from 'zod';

export const createProjectSchema = z.object({ name: z.string().min(1).max(100).describe('Project name, e.g. Mia') }).strict();

export const updateProjectSchema = z
  .object({
    id: z.string().uuid().describe('The project'),
    name: z.string().min(1).max(100).optional().describe('New name'),
    archived: z.boolean().optional().describe('Archive or restore'),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
