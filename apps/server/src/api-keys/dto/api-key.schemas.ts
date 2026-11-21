import { z } from 'zod';

export const createApiKeySchema = z
  .object({
    name: z.string().min(1).max(100).describe('Who uses the key, e.g. mia'),
    eventsUrl: z.string().url().optional().describe("Where tasker posts events (Mia's POST /connectors/events)"),
  })
  .strict();

export const updateApiKeySchema = z
  .object({
    id: z.string().uuid().describe('The key'),
    name: z.string().min(1).max(100).optional().describe('New name'),
    eventsUrl: z.string().url().nullable().optional().describe('Events URL; null turns events off'),
  })
  .strict();

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
