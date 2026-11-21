import type { JsonObjectSchema, PageAction, PageScope, PageToolSpec } from './protocol';
import { NO_ARGS } from './schema';

/** One tool as a screen file declares it; `readOnly` → `readOnlyHint` (fill / filter / navigate: no confirm card). */
export type ToolDef = {
  title: string;
  description: string;
  input?: JsonObjectSchema;
  readOnly?: boolean;
  destructive?: boolean;
  _meta?: Record<string, unknown>;
};

export const MAX_TOOLS = 20;
const NAME = /^page_[a-z0-9]+(_[a-z0-9]+)+$/;

/** Every screen's declared tools (screen → specs): the page's routing table, also read by the dev panel. */
export const SCREEN_TOOLS = new Map<string, PageToolSpec[]>();

export function toSpec(name: string, d: ToolDef): PageToolSpec {
  return {
    name,
    description: d.description,
    inputSchema: d.input ?? NO_ARGS,
    annotations: { title: d.title, ...(d.readOnly ? { readOnlyHint: true } : {}), ...(d.destructive ? { destructiveHint: true } : {}) },
    ...(d._meta ? { _meta: d._meta } : {}),
  };
}

/**
 * Declares a screen's tools once, at module level (`features/<x>/assistant/<screen>.tools.ts`), and returns
 * `scope(...)`, which the screen calls on render with its live params / sections and the handlers bound to its state.
 * A tool without a handler is not mounted right now (e.g. «delete» on a new form) and is not sent.
 */
export function defineScreenTools<const T extends Record<string, ToolDef>>(screen: string, defs: T) {
  const names = Object.keys(defs);
  if (import.meta.env.DEV) {
    const bad = names.filter((n) => !NAME.test(n));
    if (bad.length) console.warn(`[page-agent] ${screen}: names must be page_<element>_<verb>: ${bad.join(', ')}`);
    if (names.length > MAX_TOOLS) console.warn(`[page-agent] ${screen}: ${names.length} tools > ${MAX_TOOLS}`);
  }
  const specs = Object.fromEntries(names.map((n) => [n, toSpec(n, defs[n])])) as Record<keyof T & string, PageToolSpec>;
  SCREEN_TOOLS.set(screen, Object.values(specs));
  return {
    screen,
    scope(live: {
      title?: string;
      params?: Record<string, unknown>;
      sections?: Record<string, unknown>;
      handlers: Partial<Record<keyof T & string, PageAction>>;
      /** A tool's inputSchema for the current state (e.g. the open draft's own fields); the declared one otherwise. */
      inputs?: Partial<Record<keyof T & string, JsonObjectSchema>>;
    }): PageScope {
      return {
        screen,
        title: live.title,
        params: live.params,
        sections: live.sections,
        tools: (Object.entries(live.handlers) as [keyof T & string, PageAction | undefined][])
          .filter((e): e is [keyof T & string, PageAction] => !!e[1])
          .map(([n, run]) => ({ ...specs[n], ...(live.inputs?.[n] ? { inputSchema: live.inputs[n]! } : {}), run })),
      };
    },
  };
}

/** Logs every screen's declared tools at boot (one table, screen by screen); the page's whole tool list, in any host. */
export function logScreenTools(): void {
  const rows = [...SCREEN_TOOLS].flatMap(([screen, specs]) => specs.map((t) => ({ screen, ...toolLogRow(t) })));
  console.info(`[page-agent] ${rows.length} page tools on ${SCREEN_TOOLS.size} screens:\n${rows.map((r) => `${r.screen} · ${r.name}${r.actions ? ` [${r.actions}]` : ''}`).join('\n')}`);
  console.table(rows);
}

/** A tool for the console: only what it does beyond reading, as a list (`save`, `delete`); nothing for a read-only tool. */
export function toolLogRow(t: PageToolSpec): { name: string; title: string; actions?: string } {
  const actions = [!t.annotations.readOnlyHint && 'save', t.annotations.destructiveHint && 'delete'].filter(Boolean);
  return { name: t.name, title: t.annotations.title ?? '', ...(actions.length && { actions: actions.join(', ') }) };
}
