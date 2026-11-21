import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** The one place `useSearchParams` is read: string params, merged on write (never rebuilt). */
export function useAppQuery<Q extends Record<string, string | undefined>>() {
  const [sp, setSp] = useSearchParams();
  const query = useMemo(() => Object.fromEntries(sp.entries()) as Partial<Q>, [sp]);
  const patch = useCallback(
    (next: Partial<Q>) =>
      setSp(
        (prev) => {
          const out = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (v === undefined || v === '') out.delete(k);
            else out.set(k, v as string);
          }
          return out;
        },
        { replace: true },
      ),
    [setSp],
  );
  return { query, patch };
}
