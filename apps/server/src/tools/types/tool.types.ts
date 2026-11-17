import type { ZodType, ZodTypeDef } from 'zod';
import type { RequestCtx } from '../../common/context/request-context';
import type { FieldError, LookupResult } from '../../common/http/error-codes';

export type ToolAction = 'create' | 'read' | 'update' | 'delete';

export type Preview = { refs: Record<string, LookupResult | LookupResult[]>; computed: Record<string, string>; warnings: string[] };

/** One MCP tool: a camelCase zod input, semantic checks, a dry-run preview and the real run. Writes go through services. */
export interface ToolDef<I = any> {
  name: string;
  description: string;
  input: ZodType<I, ZodTypeDef, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint?: boolean };
  meta: { actions: ToolAction[]; keywords: string[]; lookup?: Record<string, string>; lookupArg?: 'query'; schemaVersion: number };
  /** Write tools: semantic validation (references exist, dates, locks). */
  check?(input: I, ctx: RequestCtx): Promise<FieldError[]>;
  /** Write tools: what the card shows for this input. */
  preview?(input: I, ctx: RequestCtx): Promise<Preview>;
  /** Write tools without a dry run / draft (settings). */
  noDraft?: boolean;
  run(input: I, ctx: RequestCtx): Promise<Record<string, unknown>>;
}

export type CallMeta = { dryRun?: boolean; batchId?: string; draftId?: string };
export type ToolOutcome = { ok: true; structured: Record<string, unknown> } | { ok: false; errors: FieldError[] };
