/**
 * Host bridge (connector contract §5): one API over Mia (`window.Mia.WebApp`, also `window.MiaWebApp`),
 * Telegram (`window.Telegram.WebApp`) and a plain browser (no-ops + a toast).
 * The page never talks to Mia or Telegram directly — only through `host`.
 */

export type HostType = 'mia' | 'telegram' | 'browser';
export type ThemeParams = Partial<Record<'bg_color' | 'text_color' | 'hint_color' | 'button_color' | 'button_text_color' | 'secondary_bg_color', string>>;
export type DraftResult = { draftId: string; status: 'saved' | 'discarded'; id?: string };

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
  offEvent(event: string, cb: (payload?: unknown) => void): void;
  sendResult?(result: DraftResult): void;
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

function readInitDataFromHash(): string | null {
  const m = /initData=([^&]+)/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

function createHost() {
  const { type, bridge } = detect();
  return {
    type,
    /** Signed launch data: the bridge's, or Mia's `#initData=` fragment. Verified by the server later (contract §5). */
    initData: bridge?.initData || readInitDataFromHash() || null,
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
    onThemeChanged(cb: () => void): Unsubscribe {
      if (!bridge) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', cb);
        return () => mq.removeEventListener('change', cb);
      }
      bridge.onEvent('themeChanged', cb);
      return () => bridge.offEvent('themeChanged', cb);
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
