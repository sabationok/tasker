import { z } from 'zod';
import { isValidTimeZone } from '../../common/context/request-context';

export const updateSettingsSchema = z
  .object({
    timezone: z.string().refine(isValidTimeZone, 'Unknown IANA time zone').optional().describe('IANA time zone of the owner, e.g. Europe/Kyiv'),
    locale: z.enum(['uk', 'en']).optional().describe('Language of messages and previews'),
    failedMode: z.enum(['missed', 'explicit']).optional().describe('missed = a scheduled day without a check-in counts as failed; explicit = only days marked failed'),
    weekStart: z.union([z.literal(1), z.literal(7)]).optional().describe('First day of the week: 1 = Monday, 7 = Sunday'),
  })
  .strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
