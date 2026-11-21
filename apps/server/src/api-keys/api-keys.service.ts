import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Not, Repository } from 'typeorm';
import { env } from '../config/env';
import { AppException } from '../common/http/app-exception';
import { ApiKeyEntity } from './entities/api-key.entity';
import { deriveKeySecret, hashApiKey } from './helpers/derive-key-secret';
import type { UpdateApiKeyInput } from './dto/api-key.schemas';

/** Name prefix of the dev header identities (`header:mia`); their secrets derive from the name. */
export const HEADER_KEY_PREFIX = 'header:';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Injectable()
export class ApiKeysService {
  constructor(@InjectRepository(ApiKeyEntity) private readonly _repo: Repository<ApiKeyEntity>) {}

  /** Creates a key; the plain value is returned once and never stored. */
  async create(name: string, eventsUrl?: string | null): Promise<{ key: string; apiKey: ApiKeyEntity }> {
    const bytes = randomBytes(32);
    const key = `tsk_${Array.from(bytes, (b) => BASE62[b % 62]).join('')}`;
    const apiKey = await this._repo.save(
      this._repo.create({
        name,
        prefix: key.slice(0, 8),
        keyHash: hashApiKey(key),
        webappSecret: deriveKeySecret('webapp', key),
        webhookSecret: deriveKeySecret('webhook', key),
        eventsUrl: eventsUrl ?? null,
      }),
    );
    return { key, apiKey: (await this._repo.findOneBy({ id: apiKey.id })) as ApiKeyEntity };
  }

  /** The active key for a bearer value, or null; bumps `lastUsedAt` at most once a minute. */
  async verify(bearer: string | undefined): Promise<ApiKeyEntity | null> {
    if (!bearer?.startsWith('tsk_')) return null;
    const apiKey = await this._repo.findOneBy({ keyHash: hashApiKey(bearer), revokedAt: IsNull() });
    if (!apiKey) return null;
    if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 60_000) {
      await this._repo.update(apiKey.id, { lastUsedAt: new Date() });
    }
    return apiKey;
  }

  /**
   * Dev auth without a key: the identity row of a client that sent `X-Tasker-Client: <name>` (created once, name
   * `header:<name>`), so drafts, MCP sessions and events still have an owner.
   */
  async headerIdentity(name: string, eventsUrl: string | null): Promise<ApiKeyEntity> {
    const rowName = `${HEADER_KEY_PREFIX}${name}`;
    const found = await this._repo.findOne({ where: { name: rowName, revokedAt: IsNull() }, select: { id: true, name: true, prefix: true, eventsUrl: true, webappSecret: true, createdAt: true, lastUsedAt: true, revokedAt: true } });
    if (found) {
      const webappSecret = deriveKeySecret('webapp', name);
      if (found.eventsUrl !== eventsUrl || found.webappSecret !== webappSecret)
        await this._repo.update(found.id, { eventsUrl, webappSecret, webhookSecret: deriveKeySecret('webhook', name) });
      return { ...found, eventsUrl } as ApiKeyEntity;
    }
    const { apiKey } = await this.create(rowName, eventsUrl);
    // Until real keys exist the header value stands in for the key in every derivation (webapp / webhook), so Mia can
    // sign initData and verify webhooks with it (agreed with Mia, 2026-11-17).
    await this._repo.update(apiKey.id, { webappSecret: deriveKeySecret('webapp', name), webhookSecret: deriveKeySecret('webhook', name) });
    return apiKey;
  }

  /**
   * Active keys with their webapp secrets (to verify a mini app's initData). A `header:*` key's secret is derived from its
   * public name, so it is forgeable: those keys count only while the dev client header is trusted (dev stage).
   */
  listWebappSecrets(): Promise<ApiKeyEntity[]> {
    return this._repo.find({ where: { revokedAt: IsNull(), ...(!env.TRUST_CLIENT_HEADER && { name: Not(Like(`${HEADER_KEY_PREFIX}%`)) }) }, select: { id: true, name: true, webappSecret: true, eventsUrl: true, createdAt: true, lastUsedAt: true, revokedAt: true, prefix: true } });
  }

  getActive(id: string): Promise<ApiKeyEntity | null> {
    return this._repo.findOneBy({ id, revokedAt: IsNull() });
  }

  findMany(): Promise<ApiKeyEntity[]> {
    return this._repo.find({ order: { createdAt: 'ASC' } });
  }

  async update(input: UpdateApiKeyInput): Promise<ApiKeyEntity> {
    const apiKey = await this._repo.findOneBy({ id: input.id });
    if (!apiKey) throw AppException.notFound('not-found:api-key');
    await this._repo.update(apiKey.id, { ...(input.name && { name: input.name }), ...(input.eventsUrl !== undefined && { eventsUrl: input.eventsUrl }) });
    return (await this._repo.findOneBy({ id: input.id })) as ApiKeyEntity;
  }

  async revoke(id: string): Promise<void> {
    const res = await this._repo.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() });
    if (!res.affected) throw AppException.notFound('not-found:api-key');
  }

  /** Active keys that receive events, with their webhook secret. */
  listWithEvents(): Promise<ApiKeyEntity[]> {
    return this._repo.find({ where: { revokedAt: IsNull(), eventsUrl: Not(IsNull()) }, select: { id: true, name: true, eventsUrl: true, webhookSecret: true } });
  }

  getWithSecret(id: string): Promise<ApiKeyEntity | null> {
    return this._repo.findOne({ where: { id, revokedAt: IsNull() }, select: { id: true, name: true, eventsUrl: true, webhookSecret: true } });
  }
}
