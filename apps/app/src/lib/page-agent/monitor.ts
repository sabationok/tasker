import type { PageAgentContext, PageAgentEvent } from './protocol';

/**
 * What the page last told the host's agent: the context as sent (or null after a clear) and the latest lifecycle
 * events. Recorded by the host transport for every call — attached host or no-op — and read by the «What the AI sees» sheet.
 */
export type MonitoredEvent = { at: number; event: PageAgentEvent };
type State = { context: PageAgentContext | null; events: MonitoredEvent[] };

const MAX_EVENTS = 8;
let state: State = { context: null, events: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const agentMonitor = {
  get: (): State => state,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  },
  context(ctx: PageAgentContext | null) {
    state = { ...state, context: ctx };
    emit();
  },
  event(event: PageAgentEvent) {
    state = { ...state, events: [{ at: Date.now(), event }, ...state.events].slice(0, MAX_EVENTS) };
    emit();
  },
};
