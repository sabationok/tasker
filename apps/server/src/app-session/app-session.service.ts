import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type IORedis from 'ioredis';
import { ApiKeysService, HEADER_KEY_PREFIX } from '../api-keys/api-keys.service';
import type { ApiKeyEntity } from '../api-keys/entities/api-key.entity';
import { AppException } from '../common/http/app-exception';
import { REDIS } from '../common/redis/redis.module';

export const APP_SESSION_COOKIE = 'tasker_app';
const SESSION_TTL_S = 30 * 60;
// TODO(redis-prefix): build from env.REDIS_PREFIX instead of literal `tasker:` — see docs/superpowers/specs/2026-11-21-redis-prefix-design.md
const key = { session: (h: string) => `tasker:app-session:${h}`, nonce: (n: string) => `tasker:initdata-nonce:${n}` };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export type InitPayload = { user?: string; profile?: string; batchId?: string; draftIds?: string[]; locale?: string; theme?: string; exp: number; nonce: string };
export type AppSession = { apiKeyId: string; batchId: string | null; draftIds: string[] };

/**
 * The mini app's sign-in (contract §5): `initData = base64url(payload).base64url(sig)`,
 * `sig = HMAC-SHA256(key = HMAC-SHA256('webapp', apiKey), payload JSON bytes)`; checked against every active key's
 * stored webapp secret, `exp` checked, the nonce used once. Opens a cookie session scoped to that key.
 */
@Injectable()
export class AppSessionService {
  constructor(
    private readonly _keys: ApiKeysService,
    @Inject(REDIS) private readonly _redis: IORedis,
  ) {}

  /** `fromLoopback`: a dev header key (forgeable secret, see ApiKeysService.listWebappSecrets) signs in only from this machine. */
  async open(initData: string, fromLoopback: boolean): Promise<{ token: string; payload: InitPayload; session: AppSession }> {
    const [p64, s64] = initData.split('.');
    if (!p64 || !s64) throw AppException.unauthorized();
    const payloadBytes = Buffer.from(p64, 'base64url');
    const sig = Buffer.from(s64, 'base64url');
    const apiKey = await this._matchKey(payloadBytes, sig);
    if (!apiKey || (apiKey.name.startsWith(HEADER_KEY_PREFIX) && !fromLoopback)) throw AppException.unauthorized();
    let payload: InitPayload;
    try {
      payload = JSON.parse(payloadBytes.toString('utf8')) as InitPayload;
    } catch {
      throw AppException.unauthorized();
    }
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now || !payload.nonce) throw AppException.unauthorized();
    const fresh = await this._redis.set(key.nonce(payload.nonce), '1', 'EX', Math.max(1, payload.exp - now), 'NX');
    if (fresh !== 'OK') throw AppException.unauthorized();
    const session: AppSession = { apiKeyId: apiKey.id, batchId: payload.batchId ?? null, draftIds: payload.draftIds ?? [] };
    const token = randomBytes(32).toString('base64url');
    await this._redis.set(key.session(hash(token)), JSON.stringify(session), 'EX', SESSION_TTL_S);
    return { token, payload, session };
  }

  /** The key behind a session cookie (each use slides the session), or null. */
  async keyOf(token: string | undefined): Promise<ApiKeyEntity | null> {
    if (!token) return null;
    const k = key.session(hash(token));
    const raw = await this._redis.get(k);
    if (!raw) return null;
    await this._redis.expire(k, SESSION_TTL_S);
    return this._keys.getActive((JSON.parse(raw) as AppSession).apiKeyId);
  }

  private async _matchKey(payload: Buffer, sig: Buffer): Promise<ApiKeyEntity | null> {
    for (const k of await this._keys.listWebappSecrets()) {
      const expected = createHmac('sha256', Buffer.from(k.webappSecret, 'hex')).update(payload).digest();
      if (expected.length === sig.length && timingSafeEqual(expected, sig)) return k;
    }
    return null;
  }
}
