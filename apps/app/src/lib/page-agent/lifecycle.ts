import type { QueryClient } from '@tanstack/react-query';
import type { PageAgentTransport } from './protocol';

/**
 * §7.4 lifecycle facts for the host, sent once per change: `busy` while any save (mutation) runs — the host then answers
 * persisting tool calls with `page_busy` instead of racing the user's own save — `visibility` on tab / window hide, and
 * `closing` on page hide, `resize` with `compact` below the app's minimum size. Optional for hosts; Mia's shim debounces them. Returns the unsubscribe.
 */
export function startPageLifecycle(transport: PageAgentTransport, queryClient: QueryClient, min: { width: number; height: number }): () => void {
  let busy = false;
  const offMutations = queryClient.getMutationCache().subscribe(() => {
    const next = queryClient.isMutating() > 0;
    if (next === busy) return;
    busy = next;
    transport.event({ type: 'busy', busy });
  });
  const onVisibility = () => transport.event({ type: 'visibility', visible: document.visibilityState === 'visible' });
  const onPageHide = () => transport.event({ type: 'closing' });
  // `compact`: narrower than the app renders (it shows a notice instead of its screens). The host debounces.
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => transport.event({ type: 'resize', width: window.innerWidth, height: window.innerHeight, compact: window.innerWidth < min.width || window.innerHeight < min.height }), 250);
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    offMutations();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('resize', onResize);
  };
}
