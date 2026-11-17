import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { isValidTimeZone, type RequestCtx } from '../../common/context/request-context';
import { AppException } from '../../common/http/app-exception';
import { toLocale } from '../../common/i18n/messages';
import { SettingsService } from '../../settings/settings.service';
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this._reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (!isPublic) {
      const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1]?.trim();
      const apiKey = await this._keys.verify(bearer);
      if (!apiKey) throw AppException.unauthorized();
      req.apiKey = apiKey;
    }
    const settings = await this._settings.get();
    const tzHeader = req.headers['x-time-zone'];
    req.ctx = {
      apiKeyId: req.apiKey?.id ?? null,
      timeZone: typeof tzHeader === 'string' && isValidTimeZone(tzHeader) ? tzHeader : settings.timezone,
      locale: req.headers['accept-language'] ? toLocale(req.headers['accept-language']) : settings.locale,
      now: new Date(),
    };
    return true;
  }
}
