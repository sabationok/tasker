import { MutationCache, QueryClient } from '@tanstack/react-query';
import { showToast } from '@/ui';
import { tr } from '@/i18n';
import { ApiError, isNetworkError } from './api/api-error';

/** One global error policy: every failed mutation shows a toast; call sites handle success only. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
  mutationCache: new MutationCache({
    // `meta.silent`: the caller shows the error itself (e.g. field errors on a draft card).
    onError: (e, _v, _c, m) => !m.meta?.silent && showToast(isNetworkError(e) ? tr(e.message) : e instanceof ApiError ? e.message : tr('Something went wrong'), 'error'),
  }),
});

/** Anything a write can change: Today, the strip, lists, stats. */
export const invalidateDomain = () =>
  Promise.all(['today', 'items', 'habits', 'stats'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
