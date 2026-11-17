import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(process.env.PORT ?? env.APP_PORT ?? 3110);
  const devAuth: Record<string, string> = env.TASKER_API_KEY ? { Authorization: `Bearer ${env.TASKER_API_KEY}` } : {};
  const apiUrl = env.TASKER_API_URL ?? 'http://127.0.0.1:3109';
  return {
    base: '/assistant/app/',
    plugins: [react(), tailwindcss()],
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
