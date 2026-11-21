import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

type Stage = 'dev' | 'production';
const STAGES: Stage[] = ['dev', 'production'];

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The stage is set per environment (never from NODE_ENV / mode): `vite` serves dev, a build must name it.
  const stage = (env.STAGE ?? (command === 'serve' ? 'dev' : undefined)) as Stage | undefined;
  if (!stage || !STAGES.includes(stage)) throw new Error(`STAGE must be one of ${STAGES.join(' | ')} (got ${env.STAGE ?? 'nothing'})`);
  const port = Number(process.env.PORT ?? env.APP_PORT ?? 3110);
  // Dev auth added by the proxy (never in the bundle): `TASKER_DEV_CLIENT=mia` → `X-Tasker-Client: mia` (server trusts it from
  // loopback when TRUST_CLIENT_HEADER=true; drafts then belong to Mia's key), else the dev key. Without both, the page relies on
  // the session cookie from `#initData` like in production.
  const devAuth: Record<string, string> = env.TASKER_DEV_CLIENT
    ? { 'X-Tasker-Client': env.TASKER_DEV_CLIENT }
    : env.TASKER_API_KEY
      ? { Authorization: `Bearer ${env.TASKER_API_KEY}` }
      : {};
  // Same-stage API for the dev proxy, one map; TASKER_API_URL overrides the running stage's value.
  const API_URL: Record<Stage, string | undefined> = { dev: 'http://127.0.0.1:3109', production: undefined };
  const apiUrl = env.TASKER_API_URL ?? API_URL[stage];
  if (command === 'serve' && !apiUrl) throw new Error(`No API URL for STAGE=${stage}: set TASKER_API_URL`);
  return {
    // Served by the tasker server at /assistant/app/; a static host (GitHub Pages) sets its own path via APP_BASE.
    base: env.APP_BASE ?? '/assistant/app/',
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_STAGE': JSON.stringify(stage) },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      // The tasker server has no CORS: in dev the page calls /api/* and Vite forwards it, adding the dev key here so it
      // never reaches the browser bundle (no VITE_ prefix on purpose).
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
          headers: devAuth,
        },
      },
    },
  };
});
