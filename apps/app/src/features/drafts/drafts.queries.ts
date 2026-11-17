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

export const useSaveDraft = () => useMutation({ mutationFn: (draftId: string) => api.post<Record<string, unknown>>('/drafts/save', { draftId }), onSuccess: afterWrite });
export const useDiscardDraft = () => useMutation({ mutationFn: (draftId: string) => api.post<unknown>('/drafts/discard', { draftId }), onSuccess: afterWrite });
export const useSaveBatch = () =>
  useMutation({ mutationFn: async (batchId: string) => (await api.post<{ results: SaveBatchResult }>('/drafts/save-batch', { batchId })).results, onSuccess: afterWrite });
