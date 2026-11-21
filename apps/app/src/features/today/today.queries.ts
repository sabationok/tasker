import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { StripDay, TodayView } from '@/contracts/tasker';

export const todayKeys = {
  all: ['today'] as const,
  day: (date: string, categoryId?: string) => [...todayKeys.all, 'day', date, categoryId ?? null] as const,
  strip: (from: string, to: string) => [...todayKeys.all, 'strip', from, to] as const,
};

export const todayQuery = (date: string, categoryId?: string) =>
  queryOptions({
    queryKey: todayKeys.day(date, categoryId),
    queryFn: ({ signal }) => api.get<TodayView>('/today', { date, categoryId }, signal),
    placeholderData: keepPreviousData,
  });

export const stripQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: todayKeys.strip(from, to),
    queryFn: async ({ signal }) => (await api.get<{ days: StripDay[] }>('/today/strip', { from, to }, signal)).days,
    placeholderData: keepPreviousData,
  });

export const useToday = (date: string, categoryId?: string) => useQuery(todayQuery(date, categoryId));
export const useStrip = (from: string, to: string) => useQuery(stripQuery(from, to));
