import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/api-error';
import type { DraftView, SaveBatchResult } from '@/contracts/tasker';
import { TOOLS, type ToolResult, type WidgetBridge } from './tools';

/**
 * Outside a host (plain browser, `pnpm --filter mcp-app dev`): the same tool calls answered by tasker REST through the
 * Vite proxy, and the opening result faked from `?batchId=`. Lets the widget be built against the real server before the
 * MCP tools exist.
 */
export function createDevBridge(): WidgetBridge {
  const asResult = (data: unknown): ToolResult => ({ structuredContent: data as Record<string, unknown> });
  const asError = (e: unknown): ToolResult => {
    const errors = e instanceof ApiError ? (e.errors.length ? e.errors : [{ message: e.message }]) : [{ message: String(e) }];
    return { isError: true, structuredContent: { valid: false, errors } };
  };
  const call = async (name: string, a: Record<string, unknown>): Promise<ToolResult> => {
    try {
      switch (name) {
        case TOOLS.review:
          return asResult({ batchId: a.batchId, items: (await api.get<{ items: DraftView[] }>('/drafts/many', { batchId: String(a.batchId) })).items });
        case TOOLS.save:
          return asResult(await api.post('/drafts/save', a.dto ? { draftId: a.draftId, dto: a.dto } : { draftId: a.draftId }));
        case TOOLS.discard:
          return asResult(await api.post('/drafts/discard', a.reason ? { draftId: a.draftId, reason: a.reason } : { draftId: a.draftId }));
        case TOOLS.saveAll:
          return asResult(await api.post<{ results: SaveBatchResult }>('/drafts/save-batch', { batchId: a.batchId }));
        default:
          return { isError: true, structuredContent: { errors: [{ message: `Unknown tool ${name}` }] } };
      }
    } catch (e) {
      return asError(e);
    }
  };
  const batchId = new URLSearchParams(location.search).get('batchId');
  return {
    embedded: false,
    callTool: call,
    onToolResult: (cb) => {
      if (batchId) queueMicrotask(() => cb({ structuredContent: { batchId } }));
    },
    tellModel: (text, data) => console.info('[tellModel]', text, data),
    theme: () => null,
    onHostChange: () => undefined,
    insets: () => null,
  };
}
