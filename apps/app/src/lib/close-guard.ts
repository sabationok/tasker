import { useEffect, useRef } from 'react';
import { host } from './host';

/**
 * Desk close protocol (sabationok/desk docs/close-protocol.md, «the block decides, silence means consent»): when the
 * app runs as a block on a desk (Mia's canvas, the web desk), the host asks before closing it with a
 * `desk:closing {id}` postMessage and waits up to 3 s for `desk:closing:reply {id, verdict}`. The app answers `dirty`
 * while any mounted form has unsaved changes (the host then asks «Закрити попри все?»), otherwise `close`.
 * Saved drafts are on the server, so a pending draft batch is not dirty; an open draft form with edits is.
 * Two transports, one verdict: postMessage for an iframe / webview block on the web desk, and the bridge's
 * `closeRequest` → `agent.event closeVerdict` in Mia (connector-protocol §7.4).
 */

type Verdict = 'close' | 'dirty' | 'keep';
type ClosingRequest = { type: 'desk:closing'; id: string | number };

const dirtyChecks = new Set<() => boolean>();

/** Marks the calling screen dirty while `isDirty` holds; unregisters on unmount (after a save the screen leaves). */
export function useCloseGuard(isDirty: boolean): void {
  const ref = useRef(isDirty);
  ref.current = isDirty;
  useEffect(() => {
    const check = () => ref.current;
    dirtyChecks.add(check);
    return () => void dirtyChecks.delete(check);
  }, []);
}

export function closeVerdict(): Verdict {
  for (const check of dirtyChecks) if (check()) return 'dirty';
  return 'close';
}

const isClosingRequest = (d: unknown): d is ClosingRequest =>
  !!d && typeof d === 'object' && (d as ClosingRequest).type === 'desk:closing' && ['string', 'number'].includes(typeof (d as ClosingRequest).id);

/**
 * Answers the host's closing requests. The reply goes back where the request came from: the parent window (an
 * iframe block), or, when a webview host posted into this window itself, its `desk` message handler. Returns the
 * unsubscribe.
 */
export function startCloseGuard(): () => void {
  const onMessage = (ev: MessageEvent) => {
    if (!isClosingRequest(ev.data)) return;
    const reply = { type: 'desk:closing:reply', id: ev.data.id, verdict: closeVerdict() };
    const from = ev.source as Window | null;
    if (from && from !== window) from.postMessage(reply, ev.origin && ev.origin !== 'null' ? ev.origin : '*');
    else webviewHandler()?.postMessage(reply);
  };
  window.addEventListener('message', onMessage);
  const offBridge = host.onCloseRequest(closeVerdict);
  return () => {
    window.removeEventListener('message', onMessage);
    offBridge();
  };
}

/** A WKWebView host's `window.webkit.messageHandlers.desk`, when present. */
function webviewHandler(): { postMessage(m: unknown): void } | undefined {
  return (window as unknown as { webkit?: { messageHandlers?: { desk?: { postMessage(m: unknown): void } } } }).webkit?.messageHandlers?.desk;
}
