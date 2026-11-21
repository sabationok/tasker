import { useSyncExternalStore } from 'react';
import { host } from './host';

/**
 * The size the page really has: the smaller of the window and what the host reports as visible
 * (`viewportChanged`; a host panel can clip a wider WebView). One subscription for the whole app.
 */
export type Viewport = { width: number; height: number };

let hostSize: Viewport | null = null;
let snapshot: Viewport = read();
const listeners = new Set<() => void>();

function read(): Viewport {
  return {
    width: Math.min(window.innerWidth, hostSize?.width ?? Infinity),
    height: Math.min(window.innerHeight, hostSize?.height ?? Infinity),
  };
}
function update() {
  const next = read();
  if (next.width === snapshot.width && next.height === snapshot.height) return;
  snapshot = next;
  listeners.forEach((l) => l());
}
window.addEventListener('resize', update);
host.onViewportChanged((size) => {
  hostSize = size;
  update();
});

export const getViewport = (): Viewport => snapshot;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
export const useViewport = (): Viewport => useSyncExternalStore(subscribe, getViewport);
