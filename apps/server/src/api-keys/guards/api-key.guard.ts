import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { env } from '../../config/env';
import { isValidTimeZone, type RequestCtx } from '../../common/context/request-context';
import { AppException } from '../../common/http/app-exception';
import { toLocale } from '../../common/i18n/messages';
import { AgentsService } from '../../agents/agents.service';
import { SettingsService } from '../../settings/settings.service';
import { APP_SESSION_COOKIE, AppSessionService } from '../../app-session/app-session.service';
import { ApiKeysService } from '../api-keys.service';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { ApiKeyEntity } from '../entities/api-key.entity';

type AuthedRequest = Request & { apiKey?: ApiKeyEntity; ctx?: RequestCtx };

/** Global: every route needs `Authorization: Bearer tsk_…` (except `@Public()`), checked per request; builds `req.ctx`. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    private readonly _keys: ApiKeysService,
    private readonly _settings: SettingsService,
    private readonly _appSessions: AppSessionService,
    private readonly _agents: AgentsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this._reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (!isPublic) {
      const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1]?.trim();
      const apiKey = bearer ? await this._keys.verify(bearer) : ((await this._headerClient(req)) ?? (await this._appSessions.keyOf(cookieOf(req, APP_SESSION_COOKIE))));
      if (!apiKey) throw AppException.unauthorized();
      req.apiKey = apiKey;
    }
    const settings = await this._settings.get();
    const tzHeader = req.headers['x-time-zone'];
    req.ctx = {
      apiKeyId: req.apiKey?.id ?? null,
      agentSlug: await this._agents.slugOfKey(req.apiKey?.id ?? null, req.apiKey?.name),
      timeZone: typeof tzHeader === 'string' && isValidTimeZone(tzHeader) ? tzHeader : settings.timezone,
      locale: req.headers['accept-language'] ? toLocale(req.headers['accept-language']) : settings.locale,
      now: new Date(),
    };
    return true;
  }

  /** Dev stage only (`TRUST_CLIENT_HEADER=true`, refused at boot elsewhere): `X-Tasker-Client: mia` from loopback stands in for an API key. */
  private async _headerClient(req: AuthedRequest): Promise<ApiKeyEntity | null> {
    const name = req.headers['x-tasker-client'];
    if (!env.TRUST_CLIENT_HEADER || typeof name !== 'string' || !/^[a-z0-9-]{1,32}$/.test(name)) return null;
    const ip = req.socket.remoteAddress ?? '';
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) return null;
    return this._keys.headerIdentity(name, env.CLIENT_HEADER_EVENTS_URL);
  }
}

/** One cookie's value from the raw header (no cookie-parser dependency). */
function cookieOf(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
