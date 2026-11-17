import { Injectable } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestCtx } from '../../../common/context/request-context';
import { DraftsService } from '../../../drafts/drafts.service';
import { SettingsService } from '../../../settings/settings.service';
import { TodayService } from '../../../today/services/today';
import { ToolsRegistry } from '../../../tools/tools.registry';
import { mapKeys, toSnake } from '../../../tools/helpers/case-keys';
import { MCP_CONTEXT_TEXT, MCP_RESOURCE_URIS } from '../../constants/context-text';
import { readRequestMeta, type McpRequestMeta } from '../../helpers/read-request-meta';
import { toolResult } from '../../helpers/tool-result';
import { SERVER_VERSION } from '../../constants/server-version';

/** Builds the low-level MCP `Server` of one session: tools from the registry, the context / today / drafts resources. */
@Injectable()
export class McpServerFactoryService {
  constructor(
    private readonly _tools: ToolsRegistry,
    private readonly _settings: SettingsService,
    private readonly _today: TodayService,
    private readonly _drafts: DraftsService,
  ) {}

  create(apiKeyId: string, subscriptions: Set<string>): Server {
    const server = new Server({ name: 'tasker', version: SERVER_VERSION }, { capabilities: { tools: { listChanged: true }, resources: { subscribe: true } } });

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: this._tools.list() as never }));

    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const meta = readRequestMeta(req.params._meta as Record<string, unknown> | undefined);
      const ctx = await this._ctx(apiKeyId, meta);
      const outcome = await this._tools.call(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>, ctx, meta);
      return toolResult(outcome) as never;
    });

    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        { uri: MCP_RESOURCE_URIS.context, name: 'context', description: 'What tasker holds (for routing)', mimeType: 'text/plain' },
        { uri: MCP_RESOURCE_URIS.today, name: 'today', description: "Today's tasks, periodic tasks and habits", mimeType: 'application/json' },
      ],
    }));
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [{ uriTemplate: `${MCP_RESOURCE_URIS.draftsPrefix}{batchId}`, name: 'drafts', description: 'The drafts of a dry-run batch and their status', mimeType: 'application/json' }],
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
      const uri = req.params.uri;
      if (uri === MCP_RESOURCE_URIS.context) return { contents: [{ uri, mimeType: 'text/plain', text: MCP_CONTEXT_TEXT }] };
      if (uri === MCP_RESOURCE_URIS.today) {
        const today = await this._today.get(undefined, await this._ctx(apiKeyId, { dryRun: false }));
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(mapKeys(JSON.parse(JSON.stringify(today)), toSnake)) }] };
      }
      if (uri.startsWith(MCP_RESOURCE_URIS.draftsPrefix)) {
        const batchId = uri.slice(MCP_RESOURCE_URIS.draftsPrefix.length);
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(await this.batchState(batchId, apiKeyId)) }] };
      }
      throw new McpError(ErrorCode.InvalidParams, `Unknown resource ${uri}`);
    });

    server.setRequestHandler(SubscribeRequestSchema, async (req) => {
      subscriptions.add(req.params.uri);
      return {};
    });
    server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
      subscriptions.delete(req.params.uri);
      return {};
    });
    return server;
  }

  /** `tasker://drafts/<batchId>`: the key's drafts of the batch (contract §6 shape, camelCase like the envelope). */
  async batchState(batchId: string, apiKeyId: string): Promise<{ batchId: string; drafts: { draftId: string; status: string; itemId?: string; label?: string }[] }> {
    const rows = /^[0-9a-f-]{36}$/i.test(batchId) ? await this._drafts.findByBatch(batchId, apiKeyId) : [];
    return {
      batchId,
      drafts: rows
        .filter((d) => d.apiKeyId === apiKeyId)
        .map((d) => ({ draftId: d.id, status: d.status, tool: d.tool, ...(d.resultId && { itemId: d.resultId }), ...(d.resultLabel && { label: d.resultLabel }) })),
    };
  }

  private async _ctx(apiKeyId: string, meta: McpRequestMeta): Promise<RequestCtx> {
    const settings = await this._settings.get();
    return { apiKeyId, timeZone: meta.timeZone ?? settings.timezone, locale: meta.locale ?? settings.locale, now: new Date() };
  }
}
