/**
 * The page-agent protocol (connector-protocol PROTOCOL.md §7.3 / §7.4; modeled on fintrack's AssistantScope).
 * A screen tells the host's agent where the user is, what they see, and which tools it offers — with their full
 * declarations `{ name, description, inputSchema, annotations }`. The page owns the routing: a registry screen → tools
 * (`defineScreenTools` in `features/<x>/assistant/*.tools.ts`), and only the live screen's tools are sent; each
 * `provideContext` REPLACES the previous one. Transport-free: Mia's WebView bridge is one adapter (lib/host.ts).
 */

// ── JSON Schema (the hub's allowlist, PROTOCOL.md §7.3: no pattern / $ref / default / oneOf) ─────────────────────────────────────────────────────────────────────
export type JsonSchema =
  | { type: 'string'; description?: string; enum?: readonly string[]; format?: 'date' | 'date-time' | 'time' | 'uuid'; minLength?: number; maxLength?: number }
  | { type: 'integer' | 'number'; description?: string; enum?: readonly number[]; minimum?: number; maximum?: number }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; description?: string; items: JsonSchema; maxItems?: number }
  | JsonObjectSchema
  | { anyOf: readonly JsonSchema[]; description?: string }
  | { type: 'null'; description?: string }
  /** Any JSON value (a list or object the handler checks itself). */
  | { description?: string; title?: string };
export type JsonObjectSchema = {
  type: 'object';
  description?: string;
  properties: Record<string, JsonSchema>;
  required?: readonly string[];
  /** The hub requires `false` wherever `properties` is (PROTOCOL.md §7.3 allowlist). */
  additionalProperties: false;
};

/**
 * MCP tool annotations, both hints always explicit (MCP's defaults are readOnlyHint false, destructiveHint true, so an
 * omitted hint would mark every write as destructive). Without `readOnlyHint: true` the hub asks the user first.
 */
export type PageToolAnnotations = { title?: string; readOnlyHint: boolean; destructiveHint: boolean; idempotentHint?: boolean };

/** What the host gets per tool (MCP tool shape). Names: `page_<element>_<verb>`. */
export type PageToolSpec = {
  name: string;
  description: string;
  inputSchema: JsonObjectSchema;
  annotations: PageToolAnnotations;
  _meta?: Record<string, unknown>;
};

/** What the page sends: the live screen, its ids, what it shows, and its tools (≤ 20). */
export type PageAgentContext = {
  screen: string;
  title?: string;
  params?: Record<string, unknown>;
  sections?: Record<string, unknown>;
  tools: PageToolSpec[];
};
export type PageToolCall = { callId: string; name: string; args: Record<string, unknown> };
export type PageToolError = { path: string; code: string; message: string };
export type PageToolOutcome = { ok: true; result?: unknown } | { ok: false; errors: PageToolError[] };
export type PageToolHandler = (call: PageToolCall) => Promise<PageToolOutcome>;
/** §7.4 lifecycle facts for the host (never sent to the model, never add tools). */
export type PageAgentEvent = { type: 'visibility'; visible: boolean } | { type: 'busy'; busy: boolean } | { type: 'closing' } | { type: 'resize'; width: number; height: number; compact: boolean }
  /** The answer to the host's `closeRequest {id}` (desk close protocol): sent at once, never debounced. */
  | { type: 'closeVerdict'; id: string | number; verdict: 'close' | 'dirty' | 'keep' };

/** One tool's handler: acts on the screen's own state and APIs — never clicks or imitated input. Args arrive validated. */
export type PageAction = (args: Record<string, unknown>) => Promise<PageToolOutcome> | PageToolOutcome;
/** A mounted tool: its declaration and the handler bound to the screen's current state. */
export type PageTool = PageToolSpec & { run: PageAction };

/** One screen's live entry, built from the screen's state on every render. */
export type PageScope = {
  screen: string;
  title?: string;
  params?: Record<string, unknown>;
  sections?: Record<string, unknown>;
  tools: PageTool[];
};

/** Where scopes go: an agent that reads the context and calls the tools. */
export type PageAgentTransport = {
  /** A host agent is attached (Mia, or the dev stand-in). Without one every call is a logged no-op. */
  attached: boolean;
  provideContext(ctx: PageAgentContext): void;
  clearContext(): void;
  onToolCall(handler: PageToolHandler): void;
  event(e: PageAgentEvent): void;
};

export const ok = (result?: unknown): PageToolOutcome => ({ ok: true, result });
export const fail = (message: string, path = '', code = 'invalid:args'): PageToolOutcome => ({ ok: false, errors: [{ path, code, message }] });
/** A required string argument, or a failure to return. */
export function argString(args: Record<string, unknown>, key: string): string | PageToolOutcome {
  const v = args[key];
  return typeof v === 'string' && v.trim() ? v : fail(`${key} is required`, key);
}
