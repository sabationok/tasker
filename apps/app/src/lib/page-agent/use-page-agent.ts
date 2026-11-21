import { ApiError } from '@/lib/api/api-error';
import { createContext, useContext, useEffect, useRef } from 'react';
import { host } from '../host';
import { MAX_TOOLS } from './registry';
import { validateArgs } from './schema';
import type { PageAgentContext, PageAgentTransport, PageScope, PageTool, PageToolSpec } from './protocol';

const MAX_SECTIONS_BYTES = 16 * 1024;

/** Keep `sections` under 16 KB: halve the longest arrays until it fits, then mark it truncated. */
function fitSections(sections: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!sections) return sections;
  let s = structuredClone(sections);
  for (let i = 0; i < 12 && JSON.stringify(s).length > MAX_SECTIONS_BYTES; i++) {
    const [key, arr] = Object.entries(s)
      .filter(([, v]) => Array.isArray(v))
      .sort((a, b) => (b[1] as unknown[]).length - (a[1] as unknown[]).length)[0] ?? [];
    if (!key) break;
    s = { ...s, [key]: (arr as unknown[]).slice(0, Math.ceil((arr as unknown[]).length / 2)), truncated: true };
  }
  return s;
}

/** Tools every screen under a layout also offers (global navigation); set by the app's layouts. */
export const PageAgentExtras = createContext<PageTool[]>([]);

const specOf = ({ run: _run, ...spec }: PageTool): PageToolSpec => spec;

/**
 * Publishes the open screen's scope to an agent transport (default: the host's — Mia's WebView bridge) as
 * `{ screen, title, params, sections, tools }` and runs the agent's calls through the mounted tools, args validated
 * against each tool's inputSchema first. `scope = null` while the screen has nothing to offer. Each change replaces the
 * context; unmount clears it (the next screen's provide replaces it anyway).
 */
export function usePageAgent(scope: PageScope | null, transport: PageAgentTransport = host.agent) {
  const extras = useContext(PageAgentExtras);
  const tools = scope ? [...scope.tools, ...extras.filter((x) => !scope.tools.some((t) => t.name === x.name))].slice(0, MAX_TOOLS) : [];
  const live = useRef<PageTool[]>([]);
  live.current = tools;

  const snapshot = scope
    ? JSON.stringify({ screen: scope.screen, title: scope.title, params: scope.params, sections: fitSections(scope.sections), tools: tools.map(specOf) } satisfies PageAgentContext)
    : null;

  const active = !!scope;
  useEffect(() => {
    if (!active) return;
    transport.onToolCall(async ({ name, args }) => {
      const tool = live.current.find((t) => t.name === name);
      if (!tool) return { ok: false, errors: [{ path: '', code: 'not-found:tool', message: `${name} is not available on this screen` }] };
      const errors = validateArgs(tool.inputSchema, args ?? {});
      if (errors.length) return { ok: false, errors };
      try {
        return await tool.run(args ?? {});
      } catch (e) {
        // The API's own field errors (ApiError.errors) come back as the tool's errors; otherwise its code
        // (`network:offline` / `network:unreachable` when the API cannot be reached: nothing was read or saved).
        if (e instanceof ApiError) {
          if (e.errors.length) return { ok: false, errors: e.errors.map((x) => ({ path: x.path ?? '', code: x.code ?? 'invalid', message: x.message })) };
          return { ok: false, errors: [{ path: '', code: e.innerCode, message: e.message }] };
        }
        return { ok: false, errors: [{ path: '', code: 'error', message: e instanceof Error ? e.message : String(e) }] };
      }
    });
  }, [active, transport]);

  const provided = useRef(false);
  useEffect(() => {
    if (!snapshot) return;
    provided.current = true;
    transport.provideContext(JSON.parse(snapshot) as PageAgentContext);
  }, [snapshot, transport]);

  useEffect(
    () => () => {
      if (provided.current) transport.clearContext();
    },
    [transport],
  );
}
