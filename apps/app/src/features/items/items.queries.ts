import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { invalidateDomain } from '@/lib/query-client';
import type { ItemInput, ItemView, OccurrenceTarget, SplitInput } from '@/contracts/tasker';

export const itemKeys = {
  all: ['items'] as const,
  list: (q: ItemsQuery) => [...itemKeys.all, 'list', q] as const,
  one: (id: string) => [...itemKeys.all, 'one', id] as const,
};

export type ItemsQuery = { periodic?: boolean; open?: boolean; parentId?: string; type?: 'task'; assignee?: string; createdBy?: string };

export const itemsQuery = (q: ItemsQuery) =>
  queryOptions({
    queryKey: itemKeys.list(q),
    queryFn: async ({ signal }) => (await api.get<{ items: ItemView[] }>('/items/many', { ...q, limit: 200 }, signal)).items,
  });

export const itemQuery = (id: string) =>
  queryOptions({ queryKey: itemKeys.one(id), queryFn: ({ signal }) => api.get<ItemView>('/items', { id }, signal) });

export const useItems = (q: ItemsQuery, enabled = true) => useQuery({ ...itemsQuery(q), enabled });
export const useItem = (id: string | undefined) => useQuery({ ...itemQuery(id ?? ''), enabled: !!id });

const write = <I, O>(fn: (input: I) => Promise<O>) => ({ mutationFn: fn, onSuccess: () => invalidateDomain() });

export const useCreateItem = () => useMutation(write((dto: ItemInput) => api.post<ItemView>('/items/create', dto)));
export const useUpdateItem = () => useMutation(write((dto: Partial<ItemInput> & { id: string }) => api.put<ItemView>('/items/update', dto)));
export const useDeleteItem = () => useMutation(write((id: string) => api.del<unknown>('/items/delete', { id })));
export const useCompleteItem = () => useMutation(write((t: OccurrenceTarget) => api.post<unknown>('/items/complete', t)));
export const useUncompleteItem = () => useMutation(write((t: OccurrenceTarget) => api.post<unknown>('/items/uncomplete', t)));
export const useSplitItem = () => useMutation(write((dto: SplitInput) => api.post<unknown>('/items/split', dto)));
export const useToggleChecklist = () => useMutation(write((dto: { id: string; date?: string }) => api.post<unknown>('/checklist/toggle', dto)));
export const useSkipOccurrence = () => useMutation(write((t: OccurrenceTarget & { note?: string }) => api.post<unknown>('/items/skip', t)));
