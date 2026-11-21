import { ApiError, type FieldError } from './api-error';

/**
 * The one fetch wrapper. Unwraps `{ statusCode, data }` and throws `ApiError` for `{ innerCode, errors[] }`.
 * Dev: Vite proxies `/api` to the server (no CORS there). Built into the server: same origin, no prefix.
 * Auth: the page never holds a key. Dev: the Vite proxy adds `Authorization` from `TASKER_API_KEY` (server-side env).
 * Built: the httpOnly session cookie from `POST /assistant/app/session` (contract §5, server TODO).
 */
const BASE = import.meta.env.VITE_TASKER_API_BASE ?? (import.meta.env.DEV ? '/api' : '');

type Query = Record<string, string | number | boolean | null | undefined>;

function toQs(q?: Query): string {
  if (!q) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${toQs(opts.query)}`, {
      method,
      headers,
      credentials: 'include',
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'network', 'Server is not reachable');
  }
  const json = (await res.json().catch(() => null)) as
    | { statusCode?: number; data?: T; message?: string; innerCode?: string; errors?: FieldError[] }
    | null;
  if (!res.ok || !json) {
    throw new ApiError(res.status, json?.innerCode ?? `http:${res.status}`, json?.message ?? res.statusText, json?.errors ?? []);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string, query: Query) => request<T>('DELETE', path, { query }),
};
