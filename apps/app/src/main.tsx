import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { host } from '@/lib/host';
import { queryClient } from '@/lib/query-client';
import { startPageLifecycle } from '@/lib/page-agent/lifecycle';
import { logScreenTools } from '@/lib/page-agent/registry';
import { startCloseGuard } from '@/lib/close-guard';
import { showToast, ToastProvider } from '@/ui';
import { router } from '@/app/router';
import { applyTheme } from '@/app/theme';
import { MIN_APP_HEIGHT, MIN_APP_WIDTH, MinWidthGate } from '@/app/min-width-gate';
import './index.css';

/** Sign in with the host's launch data first (sets the session cookie every later call relies on), then render. */
async function boot() {
  applyTheme();
  startCloseGuard();
  logScreenTools();
  const sessionError = await host.openSession((path, body) => api.post(path, body));
  startPageLifecycle(host.agent, queryClient, { width: MIN_APP_WIDTH, height: MIN_APP_HEIGHT });
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MinWidthGate>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </MinWidthGate>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
  if (sessionError) setTimeout(() => showToast(sessionError.message, 'error'), 0);
}

void boot();
