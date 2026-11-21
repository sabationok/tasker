import { isValidTimeZone } from '../../common/context/request-context';
import { type Locale, toLocale } from '../../common/i18n/messages';

export type McpRequestMeta = { dryRun: boolean; batchId?: string; draftId?: string; discard?: boolean; reason?: 'wrong_connector' | 'wrong_tool' | 'wrong_values'; locale?: Locale; timeZone?: string };

const REASONS = ['wrong_connector', 'wrong_tool', 'wrong_values'] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `tools/call` `_meta` (contract §4): dry run, batch / draft ids, locale and time zone; bad values are dropped. */
export function readRequestMeta(meta: Record<string, unknown> | undefined): McpRequestMeta {
  const m = meta ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const batchId = str(m.batchId);
  const draftId = str(m.draftId);
  const timeZone = str(m.timeZone);
  const locale = str(m.locale);
  return {
    dryRun: m.dryRun === true,
    ...(batchId && UUID.test(batchId) && { batchId }),
    ...(draftId && { draftId }),
    ...(m.discard === true && { discard: true }),
    ...(REASONS.includes(m.reason as (typeof REASONS)[number]) && { reason: m.reason as (typeof REASONS)[number] }),
    ...(locale && { locale: toLocale(locale) }),
    ...(isValidTimeZone(timeZone) && { timeZone }),
  };
}
