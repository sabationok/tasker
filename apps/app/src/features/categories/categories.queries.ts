import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Category } from '@/contracts/tasker';

export const categoryKeys = { all: ['categories'] as const };

export const categoriesQuery = queryOptions({
  queryKey: categoryKeys.all,
  queryFn: async () => (await api.get<{ items: Category[] }>('/categories/many')).items,
  staleTime: 5 * 60_000,
});

const EMPTY: Category[] = [];
export const useCategories = () => useQuery(categoriesQuery).data ?? EMPTY;
export const useDefaultCategory = () => useCategories().find((c) => c.isDefault);
