import type { PageAgentContext, PageAgentEvent, PageAgentTransport, PageToolHandler, PageToolOutcome } from './page-agent/protocol';
import { agentMonitor } from './page-agent/monitor';
import { toolLogRow } from './page-agent/registry';

/**
 * Host bridge (connector contract §5): one API over Mia (`window.Mia.WebApp`, also `window.MiaWebApp`),
 * Telegram (`window.Telegram.WebApp`) and a plain browser (no-ops + a toast).
 * The page never talks to Mia or Telegram directly — only through `host`.
 */

export type HostType = 'mia' | 'telegram' | 'browser';
export type ThemeParams = Partial<Record<'bg_color' | 'text_color' | 'hint_color' | 'button_color' | 'button_text_color' | 'secondary_bg_color', string>>;
/**
 * A decision on a draft, for the host. Mia's `sendResult` (connector-apps.ts) has draftId / status / id; outcome, changes
 * and reason are the training signal the server also stores (TODO(Mia): add them to `MiaWebAppBridgeRequest.sendResult`).
 */
export type DraftResult = {
  draftId: string;
  status: 'saved' | 'discarded';
  id?: string;
  outcome?: 'accepted' | 'edited' | 'dismissed';
  changes?: { field: string; from: unknown; to: unknown }[];
  reason?: string;
};

// ── Page agent: Mia's WebView bridge is one transport of the page-agent protocol (lib/page-agent/protocol.ts) ──
type AgentBridge = {
  provideContext(ctx: PageAgentContext): void;
  clearContext(): void;
  /** Mia's shim: calls the handler on `agent.toolCall` and posts `agent.toolResult` with its answer. */
  onToolCall(handler: PageToolHandler): void;
  /** §7.4 lifecycle facts (the shim debounces); older shims lack it. */
  event?(e: PageAgentEvent): unknown;
};

type Unsubscribe = () => void;

/** The subset both Mia and Telegram expose under the same names. */
type BridgeButton = {
  setText(text: string): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

type Bridge = {
  initData: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: ThemeParams;
  ready(): void;
  expand(): void;
  close(): void;
  MainButton: BridgeButton;
  BackButton: Pick<BridgeButton, 'show' | 'hide' | 'onClick' | 'offClick'>;
  showAlert(message: string, cb?: () => void): void;
  showConfirm(message: string, cb: (ok: boolean) => void): void;
  onEvent(event: string, cb: (payload?: unknown) => void): void;
  /** Mia's shim has none yet. */
  offEvent?(event: string, cb: (payload?: unknown) => void): void;
  sendResult?(result: DraftResult): void;
  agent?: AgentBridge;
  sendData?(data: string): void;
};

declare global {
  interface Window {
    Mia?: { WebApp?: Bridge };
    MiaWebApp?: Bridge;
    Telegram?: { WebApp?: Bridge };
  }
}

function detect(): { type: HostType; bridge: Bridge | null } {
  const mia = window.Mia?.WebApp ?? window.MiaWebApp;
  if (mia) return { type: 'mia', bridge: mia };
  // telegram-web-app.js defines WebApp everywhere; only a real Telegram launch carries initData.
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) return { type: 'telegram', bridge: tg };
  return { type: 'browser', bridge: null };
}

type Toast = (text: string) => void;
let toast: Toast = () => undefined;

/** Plain-browser fallback for `showAlert` / the «Saved» toast; set by the app's toast provider. */
export function setHostToast(fn: Toast): void {
  toast = fn;
}

/** What the signed launch opened (contract §5): returned by `POST /assistant/app/session` after the server verified it. */
export type LaunchParams = { batchId?: string; draftIds?: string[]; locale?: string; theme?: 'light' | 'dark' };

function readInitDataFromHash(): string | null {
  const m = /initData=([^&]+)/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Dev stand-in for Mia's agent: holds the last context and lets the console / dev panel call page tools. */
const devAgent = {
  enabled: import.meta.env.DEV,
  context: null as PageAgentContext | null,
  handler: null as PageToolHandler | null,
  listeners: new Set<() => void>(),
  provide(ctx: PageAgentContext | null) {
    this.context = ctx;
    this.listeners.forEach((l) => l());
  },
  async call(name: string, args: Record<string, unknown> = {}): Promise<PageToolOutcome> {
    if (!this.handler) return { ok: false, errors: [{ path: '', code: 'no-handler', message: 'No page tool handler' }] };
    return this.handler({ callId: `dev-${Date.now()}`, name, args });
  },
};
export const devAgentHost = devAgent;
if (devAgent.enabled) (window as unknown as { __taskerAgent: typeof devAgent }).__taskerAgent = devAgent;

function createHost() {
  const { type, bridge } = detect();
  /** Agent bridge calls go to the console in dev and whenever no host agent is attached (then they are no-ops). */
  const logAgent = (call: string, payload?: unknown) => {
    if (!import.meta.env.DEV && bridge?.agent) return;
    const ctx = payload as PageAgentContext | undefined;
    const label = call === 'provideContext' && ctx ? `${ctx.screen} · ${ctx.tools.length} tools: ${ctx.tools.map((t) => t.name).join(', ')}` : '';
    console.info(`[page-agent] ${call}${bridge?.agent ? '' : ' (no host: no-op)'} ${label}`, payload ?? '');
    if (call === 'provideContext' && ctx) console.table(ctx.tools.map(toolLogRow));
  };
  const initData = bridge?.initData || readInitDataFromHash() || null;
  return {
    type,
    /** Signed launch data: the bridge's, or Mia's `#initData=` fragment. Verified by the server later (contract §5). */
    initData,
    /** Filled by `openSession()` from the server's verified answer; empty without a signed launch. */
    launch: {} as LaunchParams,
    /** Who answers the page agent: the host's bridge (Mia), the dev stand-in, or nobody (plain browser, Telegram). */
    agentKind: (bridge?.agent ? 'host' : devAgent.enabled ? 'dev' : null) as 'host' | 'dev' | null,
    /**
     * Mia's signed launch → `POST /assistant/app/session { initData }` → httpOnly `tasker_app` cookie + `{ batchId, draftIds,
     * locale, theme }`. Must run before any other API call (the cookie is what authorises them). Telegram's initData is a
     * different scheme (not handled by this route yet). Returns the error, if any, so the boot can still render.
     */
    async openSession(post: (path: string, body: unknown) => Promise<unknown>): Promise<Error | null> {
      if (!initData || type === 'telegram') return null;
      try {
        const r = (await post('/assistant/app/session', { initData })) as { batchId?: string | null; draftIds?: string[] | null; locale?: string | null; theme?: string | null };
        this.launch = {
          batchId: r.batchId ?? undefined,
          draftIds: r.draftIds ?? undefined,
          locale: r.locale ?? undefined,
          theme: r.theme === 'dark' || r.theme === 'light' ? r.theme : undefined,
        };
        // The fragment carried a one-time nonce; drop it so a reload does not replay it.
        if (location.hash.includes('initData=')) history.replaceState(null, '', location.pathname + location.search);
        return null;
      } catch (e) {
        return e instanceof Error ? e : new Error(String(e));
      }
    },
    colorScheme(): 'light' | 'dark' | null {
      return bridge?.colorScheme ?? null;
    },
    themeParams(): ThemeParams {
      return bridge?.themeParams ?? {};
    },
    ready(): void {
      bridge?.ready();
      bridge?.expand();
    },
    close(): void {
      bridge?.close();
    },
    alert(message: string): void {
      if (bridge) bridge.showAlert(message);
      else toast(message);
    },
    confirm(message: string): Promise<boolean> {
      if (!bridge) return Promise.resolve(window.confirm(message));
      return new Promise((resolve) => bridge.showConfirm(message, resolve));
    },
    /** Tells the host a draft was saved or discarded (Mia: `sendResult`; Telegram: nothing to send). */
    sendResult(result: DraftResult): void {
      if (bridge?.sendResult) bridge.sendResult(result);
      else if (!bridge) toast(result.status === 'saved' ? 'Saved' : 'Discarded');
    },
    /**
     * The page's agent channel (§7.3). Mia's bridge when present; otherwise every call is a logged no-op, and in dev
     * `window.__taskerAgent` also plays the host (see `devAgent`), so screens can be driven the way Mia's model will.
     */
    agent: <PageAgentTransport>{
      attached: !!bridge?.agent || devAgent.enabled,
      provideContext(ctx: PageAgentContext): void {
        logAgent('provideContext', ctx);
        agentMonitor.context(ctx);
        if (bridge?.agent) bridge.agent.provideContext(ctx);
        else devAgent.provide(ctx);
      },
      clearContext(): void {
        logAgent('clearContext');
        agentMonitor.context(null);
        if (bridge?.agent) bridge.agent.clearContext();
        else devAgent.provide(null);
      },
      onToolCall(handler: PageToolHandler): void {
        if (bridge?.agent) bridge.agent.onToolCall(handler);
        devAgent.handler = handler;
      },
      event(e: PageAgentEvent): void {
        logAgent('event', e);
        agentMonitor.event(e);
        void bridge?.agent?.event?.(e);
      },
    },
    /**
     * The visible size the host gives the page (`viewportChanged { width, height }`), which can be smaller than the
     * WebView itself when the host clips it. TODO(Mia): emit it on panel resize. No bridge / no event: nothing is called.
     */
    onViewportChanged(cb: (size: { width: number; height: number }) => void): Unsubscribe {
      if (!bridge) return () => undefined;
      const handler = (p?: unknown) => {
        const v = p as { width?: unknown; height?: unknown } | undefined;
        if (typeof v?.width === 'number' && typeof v.height === 'number') cb({ width: v.width, height: v.height });
      };
      bridge.onEvent('viewportChanged', handler);
      return () => bridge.offEvent?.('viewportChanged', handler);
    },
    /**
     * The desk close protocol over the bridge (Mia's Mac canvas): the host sends `closeRequest { id }` and waits ~3 s for
     * `agent.event { type: 'closeVerdict', id, verdict }`; silence closes. No bridge: nothing is called (the web desk
     * asks through postMessage instead, see lib/close-guard).
     */
    onCloseRequest(verdict: () => 'close' | 'dirty' | 'keep'): Unsubscribe {
      if (!bridge) return () => undefined;
      const handler = (p?: unknown) => {
        const id = (p as { id?: unknown } | undefined)?.id;
        if (typeof id !== 'string' && typeof id !== 'number') return;
        const e = { type: 'closeVerdict' as const, id, verdict: verdict() };
        logAgent('event', e);
        agentMonitor.event(e);
        void bridge.agent?.event?.(e);
      };
      bridge.onEvent('closeRequest', handler);
      return () => bridge.offEvent?.('closeRequest', handler);
    },
    onThemeChanged(cb: () => void): Unsubscribe {
      if (!bridge) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', cb);
        return () => mq.removeEventListener('change', cb);
      }
      bridge.onEvent('themeChanged', cb);
      return () => bridge.offEvent?.('themeChanged', cb);
    },
    /** The host's main button; null in a plain browser (the page draws its own). */
    mainButton(): BridgeButton | null {
      return bridge?.MainButton ?? null;
    },
    backButton(): Bridge['BackButton'] | null {
      return bridge?.BackButton ?? null;
    },
  };
}

export const host = createHost();
export type Host = typeof host;
