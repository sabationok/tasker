import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { invalidateDomain, queryClient } from '@/lib/query-client';
import type { DraftView, SaveBatchResult } from '@/contracts/tasker';

export const draftKeys = { all: ['drafts'] as const, batch: (batchId: string) => [...draftKeys.all, batchId] as const };

export const batchQuery = (batchId: string) =>
  queryOptions({
    queryKey: draftKeys.batch(batchId),
    queryFn: async ({ signal }) => (await api.get<{ items: DraftView[] }>('/drafts/many', { batchId }, signal)).items,
  });

export const useBatch = (batchId: string | undefined) => useQuery({ ...batchQuery(batchId ?? ''), enabled: !!batchId });

const afterWrite = () => Promise.all([invalidateDomain(), queryClient.invalidateQueries({ queryKey: draftKeys.all })]);

/** Save one draft as is, or with the edited `dto` (camelCase): the server re-validates and stores outcome + changes. */
export type SaveDraftInput = { draftId: string; dto?: Record<string, unknown> };
export const useSaveDraft = () =>
  useMutation({
    mutationFn: ({ draftId, dto }: SaveDraftInput) => api.post<Record<string, unknown>>('/drafts/save', dto ? { draftId, dto } : { draftId }),
    onSettled: afterWrite,
    meta: { silent: true },
  });
/** Dismiss with an optional reason (training signal). */
export type DiscardDraftInput = { draftId: string; reason?: string };
export const useDiscardDraft = () =>
  useMutation({ mutationFn: ({ draftId, reason }: DiscardDraftInput) => api.post<unknown>('/drafts/discard', reason ? { draftId, reason } : { draftId }), onSettled: afterWrite });
export const useSaveBatch = () =>
  useMutation({ mutationFn: async (batchId: string) => (await api.post<{ results: SaveBatchResult }>('/drafts/save-batch', { batchId })).results, onSettled: afterWrite });
