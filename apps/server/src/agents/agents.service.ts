import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { FieldError, LookupResult } from '../common/http/error-codes';
import { rankTextMatches } from '../common/helpers/rank-text-matches';
import { msg, type Locale } from '../common/i18n/messages';
import { AgentEntity } from './entities/agent.entity';
import { USER_ASSIGNEE, type AgentView } from './types/agent.types';

/** Agents and which one a caller is (by its API key). */
@Injectable()
export class AgentsService {
  /** apiKeyId → agent slug, or null for a key that is not an agent's; agents are few and rarely change. */
  private readonly _slugOfKey = new Map<string, string | null>();

  constructor(@InjectRepository(AgentEntity) private readonly _repo: Repository<AgentEntity>) {}

  async findMany(): Promise<AgentView[]> {
    return (await this._repo.find({ order: { createdAt: 'ASC' } })).map(toView);
  }

  /**
   * The agent a key belongs to. A dev header identity (`header:<slug>`, from `X-Tasker-Client`) is bound on first
   * sight to the unbound agent with that slug, so `X-Tasker-Client: mia` acts as Mia.
   */
  async slugOfKey(apiKeyId: string | null, keyName?: string): Promise<string | null> {
    if (!apiKeyId) return null;
    const cached = this._slugOfKey.get(apiKeyId);
    if (cached !== undefined) return cached;
    let agent = await this._repo.findOneBy({ apiKeyId });
    const headerSlug = keyName?.startsWith('header:') ? keyName.slice('header:'.length) : null;
    if (!agent && headerSlug) {
      agent = await this._repo.findOneBy({ slug: headerSlug, apiKeyId: IsNull() });
      if (agent) await this._repo.update(agent.id, { apiKeyId });
    }
    // only a found agent is cached for good; a miss is re-checked (a key can be bound later)
    if (agent) this._slugOfKey.set(apiKeyId, agent.slug);
    return agent?.slug ?? null;
  }

  /** Field error when `value` is neither `me` nor a known agent. */
  async checkAssignee(value: string | undefined, path: string, locale: Locale): Promise<FieldError[]> {
    if (value === undefined || value === USER_ASSIGNEE) return [];
    return (await this._repo.existsBy({ slug: value })) ? [] : [{ path, code: 'not-found:agent', message: msg(locale, 'not-found:agent') }];
  }

  /** Lookup for `assignee`: the user (`me`) and the agents; id = the slug. */
  async lookup(query: string, limit = 10): Promise<LookupResult[]> {
    const options = [{ id: USER_ASSIGNEE, label: 'Я (користувач)' }, ...(await this.findMany()).map((a) => ({ id: a.slug, label: a.name }))];
    return query ? rankTextMatches(options, (o) => `${o.label} ${o.id}`, query, limit) : options.slice(0, limit);
  }
}

const toView = (a: AgentEntity): AgentView => ({ slug: a.slug, name: a.name, icon: a.icon, color: a.color, description: a.description });
