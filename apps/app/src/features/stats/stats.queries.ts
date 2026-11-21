import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { StatsPeriod, StatsScope, StatsView } from '@/contracts/tasker';

export const statsKeys = { all: ['stats'] as const, one: (q: StatsQuery) => [...statsKeys.all, q] as const };
export type StatsQuery = { period: StatsPeriod; anchor: string; scope: StatsScope };

export const statsQuery = (q: StatsQuery) =>
  queryOptions({ queryKey: statsKeys.one(q), queryFn: ({ signal }) => api.get<StatsView>('/stats', q, signal), placeholderData: keepPreviousData });

export const useStats = (q: StatsQuery) => useQuery(statsQuery(q));
