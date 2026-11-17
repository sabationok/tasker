import type { ToolOutcome } from '../../tools/types/tool.types';

export type McpToolResult = { content: { type: 'text'; text: string }[]; structuredContent: Record<string, unknown>; isError?: boolean };

/** A registry outcome as an MCP `tools/call` result; errors → `isError` + `{ valid: false, errors }`. */
export function toolResult(outcome: ToolOutcome): McpToolResult {
  if (outcome.ok) return { content: [{ type: 'text', text: JSON.stringify(outcome.structured) }], structuredContent: outcome.structured };
  return {
    content: [{ type: 'text', text: outcome.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join('; ') }],
    structuredContent: { valid: false, errors: outcome.errors },
    isError: true,
  };
}
