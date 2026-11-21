import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { invalidateDomain } from '@/lib/query-client';
import type { CheckInInput, CheckinView, HabitInput, HabitView } from '@/contracts/tasker';

export const habitKeys = {
  all: ['habits'] as const,
  list: (status: 'active' | 'archived') => [...habitKeys.all, 'list', status] as const,
  one: (id: string) => [...habitKeys.all, 'one', id] as const,
  checkins: (id: string, from: string, to: string) => [...habitKeys.all, 'checkins', id, from, to] as const,
};

export const habitsQuery = (status: 'active' | 'archived') =>
  queryOptions({
    queryKey: habitKeys.list(status),
    queryFn: async ({ signal }) => (await api.get<{ items: HabitView[] }>('/habits/many', { status }, signal)).items,
  });
export const habitQuery = (id: string) =>
  queryOptions({ queryKey: habitKeys.one(id), queryFn: ({ signal }) => api.get<HabitView>('/habits', { id }, signal) });
export const checkinsQuery = (habitId: string, from: string, to: string) =>
  queryOptions({
    queryKey: habitKeys.checkins(habitId, from, to),
    queryFn: async ({ signal }) => {
      const data = await api.get<{ items: CheckinView[] } | CheckinView[]>('/habits/check-ins', { habitId, from, to }, signal);
      return Array.isArray(data) ? data : data.items;
    },
  });

export const useHabits = (status: 'active' | 'archived') => useQuery(habitsQuery(status));
export const useHabit = (id: string | undefined) => useQuery({ ...habitQuery(id ?? ''), enabled: !!id });
export const useCheckins = (habitId: string | undefined, date: string) => useQuery({ ...checkinsQuery(habitId ?? '', date, date), enabled: !!habitId });

const write = <I, O>(fn: (input: I) => Promise<O>) => ({ mutationFn: fn, onSuccess: () => invalidateDomain() });

export const useCreateHabit = () => useMutation(write((dto: HabitInput) => api.post<HabitView>('/habits/create', dto)));
export const useUpdateHabit = () => useMutation(write((dto: Partial<HabitInput> & { id: string }) => api.put<HabitView>('/habits/update', dto)));
export const useCheckIn = () => useMutation(write((dto: CheckInInput) => api.post<unknown>('/habits/check-in', dto)));
export const useArchiveHabit = () => useMutation(write((id: string) => api.post<unknown>('/habits/archive', { id })));
export const useRestoreHabit = () => useMutation(write((id: string) => api.post<unknown>('/habits/restore', { id })));
export const useDeleteHabit = () => useMutation(write((id: string) => api.del<unknown>('/habits/delete', { id })));
