import { isoToLocalInput, localInputToIso } from '@/lib/dates';
import type { DraftFieldError } from '@/contracts/tasker';
import type { FieldKind } from './tool-fields';
import { fieldOf, orderedEntries } from './draft.lib';

/** The edit form: one value per DTO key (camelCase). Strings for text-like controls, booleans for switches. */
export type DraftFormValues = Record<string, string | boolean>;
/** A field of the form: its key, schema kind, and whether it is shown read-only (resolved references). */
export type DraftFormField = { key: string; kind: FieldKind; options?: (string | number)[]; nullable: boolean };

/** The fields the form shows: every key of the draft's input, typed by the tool's schema (unknown keys as text). */
export function formFields(tool: string, dto: Record<string, unknown>): DraftFormField[] {
  return orderedEntries(tool, dto).map(([key]) => {
    const f = fieldOf(tool, key);
    return { key, kind: f?.kind ?? 'string', options: f?.options, nullable: f?.nullable ?? true };
  });
}

export function toFormValue(f: DraftFormField, v: unknown): string | boolean {
  if (f.kind === 'boolean') return v === true;
  if (v === null || v === undefined) return '';
  if (f.kind === 'datetime' && typeof v === 'string') return isoToLocalInput(v);
  if (f.kind === 'date' && typeof v === 'string') return v.slice(0, 10);
  if (f.kind === 'array' || f.kind === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

export const toFormValues = (fields: DraftFormField[], dto: Record<string, unknown>): DraftFormValues =>
  Object.fromEntries(fields.map((f) => [f.key, toFormValue(f, dto[f.key])]));

/**
 * Form values → the edited DTO. Empty optional fields become `null` (cleared), empty required ones are dropped so the
 * server reports them. Bad JSON / numbers come back as field errors instead of a request.
 */
export function toDto(fields: DraftFormField[], values: DraftFormValues, original: Record<string, unknown>): { dto: Record<string, unknown>; errors: DraftFieldError[] } {
  const dto: Record<string, unknown> = { ...original };
  const errors: DraftFieldError[] = [];
  for (const f of fields) {
    if (f.kind === 'ref') continue; // resolved ids are not edited here
    const raw = values[f.key];
    if (f.kind === 'boolean') {
      dto[f.key] = raw === true;
      continue;
    }
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) {
      if (f.nullable) dto[f.key] = null;
      else delete dto[f.key];
      continue;
    }
    switch (f.kind) {
      case 'number': {
        const n = Number(s.replace(',', '.'));
        if (Number.isNaN(n)) errors.push({ path: f.key, message: 'Not a number' });
        else dto[f.key] = n;
        break;
      }
      case 'enum':
        dto[f.key] = f.options?.some((o) => typeof o === 'number') ? Number(s) : s;
        break;
      case 'datetime':
        dto[f.key] = localInputToIso(s);
        break;
      case 'array':
      case 'object':
        try {
          dto[f.key] = JSON.parse(s);
        } catch {
          errors.push({ path: f.key, message: 'Invalid JSON' });
        }
        break;
      default:
        dto[f.key] = s;
    }
  }
  return { dto, errors };
}
