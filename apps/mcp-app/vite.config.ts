import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/**
 * Builds ONE self-contained HTML file (`dist/index.html`): the host renders it from a `ui://` resource inside a sandboxed
 * iframe whose CSP blocks external scripts, so everything (React, ext-apps, CSS) is inlined.
 * UI pieces come from the mobile app (`@` → apps/app/src) — one design system for both. TODO: extract to packages/ui.
 */
export default defineConfig(({ mode }) => {
  const appEnv = loadEnv(mode, fileURLToPath(new URL('../app', import.meta.url)), '');
  const devAuth: Record<string, string> = appEnv.TASKER_API_KEY ? { Authorization: `Bearer ${appEnv.TASKER_API_KEY}` } : {};
  return {
    base: './',
    plugins: [react(), tailwindcss(), viteSingleFile()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../app/src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: { outDir: 'dist', emptyOutDir: true },
    server: {
      host: '127.0.0.1',
      port: Number(process.env.PORT ?? 3111),
      strictPort: true,
      fs: { allow: ['..', '../..'] },
      // Dev only: outside a host the widget's tool calls are mapped to tasker REST through this proxy (see src/bridge/dev-bridge.ts).
      proxy: {
        '/api': { target: appEnv.TASKER_API_URL ?? 'http://127.0.0.1:3109', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, ''), headers: devAuth },
      },
    },
  };
});
