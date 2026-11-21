import { intlLocale, tr } from '@/i18n';
import { formatDay, parseDateTime } from '@/lib/dates';
import type { DraftFieldError, DraftView } from '@/contracts/tasker';
import type { ToolField } from './tool-fields';
import { TOOL_FIELDS } from './tool-fields.gen';

/** What the review shows for a draft; `invalid` is client-side: the last save attempt returned field errors. */
export type DraftState = 'pending' | 'saving' | 'saved' | 'invalid' | 'discarded' | 'expired';

export function draftState(d: DraftView, errors: DraftFieldError[] | undefined): DraftState {
  if (d.status === 'draft') return errors?.length ? 'invalid' : 'pending';
  return d.status === 'saving' ? 'saving' : d.status;
}

/** Tool name → label source text (the schema has no tool titles). */
export const TOOL_LABEL: Record<string, string> = {
  create_item: 'New task',
  update_item: 'Task change',
  complete_item: 'Mark done',
  uncomplete_item: 'Reopen',
  delete_item: 'Delete task',
  add_note: 'Note to task',
  split_task: 'Split into threads',
  toggle_checklist_item: 'Checklist item',
  skip_occurrence: 'Skip a day',
  move_occurrence: 'Move a day',
  create_habit: 'New habit',
  update_habit: 'Habit change',
  check_in_habit: 'Habit check-in',
  archive_habit: 'Archive habit',
  create_project: 'New project',
  create_category: 'New category',
  update_settings: 'Settings',
};

export const DISCARD_REASONS = ['wrong_connector', 'wrong_tool', 'wrong_values'] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];
export const DISCARD_REASON_LABEL: Record<DiscardReason, string> = {
  wrong_connector: 'Wrong connector',
  wrong_tool: 'Wrong action',
  wrong_values: 'Wrong values',
};

// ── field names ────────────────────────────────────────────────────────────────────────────────────────────────
// A draft's `dto` is camelCase; the tool schema, `preview.refs`, error paths and training `changes` are snake_case.
export const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
/** `remind_at` / `checklist.0.title` → the top-level form field `remindAt`. */
export const errorField = (e: DraftFieldError): string => toCamel((e.path ?? '').split('.')[0]);

export const fieldOf = (tool: string, key: string): ToolField | undefined => TOOL_FIELDS[tool]?.fields[toSnake(key)];
export const fieldTitle = (tool: string, key: string): string => fieldOf(tool, key)?.title ?? toSnake(key);

// ── card rows ──────────────────────────────────────────────────────────────────────────────────────────────────
export const isEmptyValue = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** Enum values the user reads (item type, status, priority, …) → label source texts. */
export const ENUM_LABEL: Record<string, string> = {
  task: 'Task',
  idea: 'Idea',
  note: 'Note',
  inbox: 'Inbox',
  todo: 'To do',
  doing: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived',
  me: 'Me',
  claude: 'Agent',
  yes_no: 'Yes or no',
  numeric: 'Numeric value',
  checklist: 'Checklist',
  timer: 'Timer',
  stopwatch: 'Stopwatch',
  at_least: 'At least',
  at_most: 'At most',
  exactly: 'Exactly',
  any: 'Any order',
  sequential: 'Sequential',
  skipped: 'Skipped',
  failed: 'Failed',
};
export const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };

type Ref = { label?: string; path?: string };
export function refText(d: DraftView, snake: string): string | undefined {
  const r = d.preview?.refs?.[snake] as Ref | Ref[] | undefined;
  if (!r) return undefined;
  const one = (x: Ref) => x.path ?? x.label;
  return Array.isArray(r) ? r.map(one).filter(Boolean).join(', ') : one(r);
}

/** A DTO value as text, by the schema's kind. */
export function formatValue(tool: string, key: string, v: unknown): string {
  const f = fieldOf(tool, key);
  if (toSnake(key) === 'priority' && typeof v === 'number') return tr(PRIORITY_LABEL[v] ?? String(v));
  if (typeof v === 'boolean') return v ? tr('Yes') : tr('No');
  if (f?.kind === 'date' && typeof v === 'string') return formatDay(v.slice(0, 10), intlLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  if (f?.kind === 'datetime' && typeof v === 'string') {
    const d = parseDateTime(v);
    return d ? new Intl.DateTimeFormat(intlLocale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d) : v;
  }
  if (typeof v === 'string') return ENUM_LABEL[v] ? tr(ENUM_LABEL[v]) : v;
  if (Array.isArray(v))
    return v.map((x) => (x && typeof x === 'object' ? ((x as { title?: string }).title ?? (x as { name?: string }).name ?? JSON.stringify(x)) : String(x))).join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** One row per filled field: the schema's Ukrainian title, and the resolved ref (path / label) or the formatted value. */
export function draftRows(d: DraftView): [string, string][] {
  return orderedEntries(d.tool, d.dto)
    .filter(([, v]) => !isEmptyValue(v))
    .map(([k, v]) => [fieldTitle(d.tool, k), refText(d, toSnake(k)) ?? formatValue(d.tool, k, v)]);
}

/** DTO entries in the tool schema's field order (unknown keys last), so cards and forms read the same way every time. */
export function orderedEntries(tool: string, dto: Record<string, unknown>): [string, unknown][] {
  const order = Object.keys(TOOL_FIELDS[tool]?.fields ?? {});
  const rank = (k: string) => {
    const i = order.indexOf(toSnake(k));
    return i < 0 ? order.length : i;
  };
  return Object.entries(dto).sort(([a], [b]) => rank(a) - rank(b));
}

export function draftTitle(d: DraftView): string {
  const t = d.dto.title ?? d.dto.name ?? d.dto.text;
  return typeof t === 'string' && t.trim() ? t : tr(TOOL_LABEL[d.tool] ?? d.tool);
}

// ── training signal ────────────────────────────────────────────────────────────────────────────────────────────
export type DraftChange = { field: string; from: unknown; to: unknown };
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What the user changed in the form, field by field (snake_case, like the server's `changes`). */
export function diffDto(before: Record<string, unknown>, after: Record<string, unknown>): DraftChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => !same(before[k], after[k])).map((k) => ({ field: toSnake(k), from: before[k] ?? null, to: after[k] ?? null }));
}
