import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Locale } from '../i18n/messages';

/** Who calls and in which time zone / language; every service method that writes or reads "today" takes it. */
export interface RequestCtx {
  apiKeyId: string | null;
  timeZone: string;
  locale: Locale;
  now: Date;
}

/** `@Ctx()` — the context the auth guard attached to the request. */
export const Ctx = createParamDecorator((_: unknown, host: ExecutionContext): RequestCtx => {
  const req = host.switchToHttp().getRequest<{ ctx?: RequestCtx }>();
  return req.ctx ?? { apiKeyId: null, timeZone: 'Europe/Kyiv', locale: 'uk', now: new Date() };
});

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
