import type { DraftFieldChange } from '../../drafts/types/draft.types';
import { toSnake } from './case-keys';

/** Top-level fields whose value differs between the drafted DTO and the saved one (snake_case names). */
export function draftChanges(before: Record<string, unknown>, after: Record<string, unknown>): DraftFieldChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map((k) => ({ field: toSnake(k), from: before[k] ?? null, to: after[k] ?? null }));
}
