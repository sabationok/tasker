/**
 * What this widget needs from tasker's MCP server. The server side is not built yet (TODO for the server session):
 *
 * 1. Resource `ui://tasker/review.html`, mimeType `text/html;profile=mcp-app` = this package's `dist/index.html`.
 * 2. Every write tool (create_item, update_item, create_habit, …) declares `_meta.ui.resourceUri` = that URI, so a host
 *    renders the widget under its dry-run result. The widget reads `structuredContent` of that result:
 *    `{ valid, draftId, batchId, errors, preview }` (contract §4) — or `{ batchId, items }` from REVIEW below.
 * 3. Widget-only tools (`_meta.ui.visibility: ['app']`, hidden from the model), same rules as the REST `/drafts/*`:
 */
export const TOOLS = {
  /** `{ batchId }` → `{ batchId, items: DraftView[] }`. Also the model-visible way to open a review of a batch. */
  review: 'review_drafts',
  /** `{ draftId, dto? }` (edited DTO, camelCase) → the tool's own result + `{ draftId, batchId }`; invalid → `isError` + `{ valid: false, errors[] }`. */
  save: 'save_draft',
  /** `{ draftId, reason? }` (wrong_connector | wrong_tool | wrong_values) → the draft. */
  discard: 'discard_draft',
  /** `{ batchId }` → `{ results: [{ draftId, status: 'saved' | 'invalid' | 'skipped', errors? }] }`. */
  saveAll: 'save_drafts',
} as const;

export type ToolResult = { isError?: boolean; structuredContent?: Record<string, unknown>; content?: { type: string; text?: string }[] };

/** The widget's view of its host: tool calls, the result that opened it, telling the model, theme. */
export type WidgetBridge = {
  embedded: boolean;
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  /** The tool result the host rendered this widget for (and later ones, if the host reuses the widget). */
  onToolResult: (cb: (r: ToolResult) => void) => void;
  /** Silent context for the model: what the user decided here. */
  tellModel: (text: string, data?: Record<string, unknown>) => void;
  theme: () => 'light' | 'dark' | null;
  onHostChange: (cb: () => void) => void;
  insets: () => { top: number; right: number; bottom: number; left: number } | null;
};
