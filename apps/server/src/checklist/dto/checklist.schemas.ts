import { z } from 'zod';

export const createChecklistLineSchema = z.object({ itemId: z.string().uuid().describe('The item'), title: z.string().min(1).max(200).describe('Line text') }).strict();
export const updateChecklistLineSchema = z
  .object({ id: z.string().uuid().describe('The line'), title: z.string().min(1).max(200).optional().describe('New text'), position: z.number().int().min(1).optional().describe('New position') })
  .strict();
export const toggleChecklistLineSchema = z
  .object({
    id: z.string().uuid().describe('The checklist line'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Periodic task: the day, YYYY-MM-DD; default today'),
    slot: z.number().int().min(0).max(23).optional().describe('Hourly periodic task: the hour'),
  })
  .strict();
