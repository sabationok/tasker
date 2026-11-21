import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api/api-error';
import type { DraftFieldError, DraftView, SaveBatchResult } from '@/contracts/tasker';
import type { DraftSource } from '@/features/drafts/review/use-draft-review';
import { TOOLS, type ToolResult, type WidgetBridge } from '~/bridge/tools';

/** A failed tool result as the error the review shows (field errors when the server gave them). */
function toError(r: ToolResult): ApiError {
  const sc = r.structuredContent ?? {};
  const errors = (Array.isArray(sc.errors) ? sc.errors : []) as DraftFieldError[];
  const text = r.content?.find((c) => c.type === 'text')?.text;
  return new ApiError(400, 'invalid', errors[0]?.message ?? text ?? 'Tool call failed', errors);
}
async function call<T>(bridge: WidgetBridge, name: string, args: Record<string, unknown>): Promise<T> {
  const r = await bridge.callTool(name, args);
  if (r.isError) throw toError(r);
  return (r.structuredContent ?? {}) as T;
}

/** The review's drafts over the widget's tools: list with `review_drafts`, decide with `save_draft` / `discard_draft` / `save_drafts`. */
export function useMcpDraftSource(bridge: WidgetBridge, batchId: string | null, initial: DraftView[] | null): DraftSource {
  const [drafts, setDrafts] = useState<DraftView[]>(initial ?? []);
  const [isLoading, setLoading] = useState(!initial && !!batchId);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    if (!batchId) return;
    try {
      const r = await call<{ items: DraftView[] }>(bridge, TOOLS.review, { batchId });
      setDrafts(r.items ?? []);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [bridge, batchId]);

  useEffect(() => {
    if (initial) setDrafts(initial);
    void refetch();
  }, [refetch, initial]);

  return useMemo<DraftSource>(
    () => ({
      drafts,
      isLoading,
      error,
      refetch: () => void refetch(),
      save: async (draftId, dto) => {
        try {
          const r = await call<{ id?: unknown }>(bridge, TOOLS.save, dto ? { draftId, dto } : { draftId });
          return { id: typeof r.id === 'string' ? r.id : undefined };
        } finally {
          void refetch();
        }
      },
      discard: async (draftId, reason) => {
        await call(bridge, TOOLS.discard, reason ? { draftId, reason } : { draftId });
        void refetch();
      },
      saveAll: async () => {
        const r = await call<{ results: SaveBatchResult }>(bridge, TOOLS.saveAll, { batchId });
        void refetch();
        return r.results ?? [];
      },
    }),
    [bridge, batchId, drafts, isLoading, error, refetch],
  );
}
