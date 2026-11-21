import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@/ui';
import { createDevBridge } from './bridge/dev-bridge';
import { createHostBridge } from './bridge/host-bridge';
import type { WidgetBridge } from './bridge/tools';
import { ReviewWidget } from './review/review-widget';
import './index.css';

/** Theme and safe-area insets from the host context. */
function applyHost(bridge: WidgetBridge) {
  const root = document.documentElement;
  root.dataset.theme = bridge.theme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const i = bridge.insets();
  if (i) document.body.style.padding = `${i.top}px ${i.right}px ${i.bottom}px ${i.left}px`;
}

async function boot() {
  const embedded = window.parent !== window;
  const bridge = embedded ? await createHostBridge() : createDevBridge();
  if (embedded) document.documentElement.dataset.embedded = '';
  applyHost(bridge);
  bridge.onHostChange(() => applyHost(bridge));
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <ReviewWidget bridge={bridge} />
      </ToastProvider>
    </StrictMode>,
  );
}

void boot();
