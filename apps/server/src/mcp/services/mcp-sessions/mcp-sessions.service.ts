import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ApiKeysService } from '../../../api-keys/api-keys.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SettingsService } from '../../../settings/settings.service';
import { ToolsRegistry } from '../../../tools/tools.registry';
import type { McpSession } from '../../types/mcp-session.types';
import { McpServerFactoryService } from '../mcp-server-factory';

const SESSION_IDLE_MS = 24 * 3600_000;
const SESSIONS_PER_KEY = 5;

/** Open MCP sessions (streamable HTTP, stateful), each bound to its API key; sends resource / tool-list notifications. */
@Injectable()
export class McpSessionsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly _sessions = new Map<string, McpSession>();
  private readonly _logger = new Logger(McpSessionsService.name);

  constructor(
    private readonly _factory: McpServerFactoryService,
    private readonly _tools: ToolsRegistry,
    private readonly _settings: SettingsService,
    private readonly _keys: ApiKeysService,
  ) {}

  /** The session (and marks it used). */
  find(sessionId: string): McpSession | undefined {
    const s = this._sessions.get(sessionId);
    if (s) s.lastSeenAt = Date.now();
    return s;
  }

  /**
   * Every 5 min: clients that restart without `DELETE` leave sessions behind. Closes sessions of revoked keys, sessions
   * unused for 24 h, and beyond the newest 5 per key.
   */
  @Interval(5 * 60_000)
  async evictStale(): Promise<number> {
    const now = Date.now();
    const byKey = new Map<string, McpSession[]>();
    for (const s of this._sessions.values()) byKey.set(s.apiKeyId, [...(byKey.get(s.apiKeyId) ?? []), s]);
    const doomed: McpSession[] = [];
    for (const [apiKeyId, list] of byKey) {
      const active = await this._keys.getWithSecret(apiKeyId);
      const sorted = list.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
      sorted.forEach((s, i) => (!active || now - s.lastSeenAt > SESSION_IDLE_MS || i >= SESSIONS_PER_KEY) && doomed.push(s));
    }
    await Promise.all(doomed.map((s) => s.transport.close().catch(() => undefined)));
    for (const s of doomed) if (s.transport.sessionId) this._sessions.delete(s.transport.sessionId);
    if (doomed.length) this._logger.log(`MCP sessions closed: ${doomed.length}`);
    return doomed.length;
  }

  /** A new session for the key; it is registered once the transport assigns its id (on `initialize`). */
  async open(apiKeyId: string): Promise<McpSession> {
    const subscriptions = new Set<string>();
    const server = this._factory.create(apiKeyId, subscriptions);
    const session = { server, apiKeyId, subscriptions, lastSeenAt: Date.now() } as McpSession;
    session.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => void this._sessions.set(id, session),
    });
    session.transport.onclose = () => {
      if (session.transport.sessionId) this._sessions.delete(session.transport.sessionId);
    };
    await server.connect(session.transport);
    return session;
  }

  /** `notifications/resources/updated` to the key's sessions subscribed to the URI. */
  async notifyResourceUpdated(apiKeyId: string | null, uri: string): Promise<number> {
    const targets = [...this._sessions.values()].filter((s) => s.apiKeyId === apiKeyId && s.subscriptions.has(uri));
    await Promise.all(targets.map((s) => s.server.sendResourceUpdated({ uri }).catch((e: Error) => this._logger.warn(`resources/updated: ${e.message}`))));
    return targets.length;
  }

  async notifyToolsChanged(): Promise<void> {
    await Promise.all([...this._sessions.values()].map((s) => s.server.sendToolListChanged().catch(() => undefined)));
  }

  /** On start: a changed tool schema → store the new hash and tell open sessions (`tools/list_changed`). */
  async onApplicationBootstrap(): Promise<void> {
    const hash = this._tools.schemaHash();
    const settings = await this._settings.get();
    if (settings.toolsSchemaHash === hash) return;
    await this._settings.update({ toolsSchemaHash: hash });
    await this.notifyToolsChanged();
    this._logger.log(`tools schema ${settings.toolsSchemaHash ?? '-'} → ${hash}`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this._sessions.values()].map((s) => s.transport.close().catch(() => undefined)));
  }
}
