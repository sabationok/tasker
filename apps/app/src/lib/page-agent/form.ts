import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';
import { ok, type PageToolOutcome } from './protocol';

/**
 * A form field as the agent sees it (snake_case key → the react-hook-form field). `read` turns the form value into what
 * the agent reads; `write` sets it (default: `setValue(field, v)`), for fields that touch more than one control.
 */
export type AgentField<V extends FieldValues> = {
  field: Path<V>;
  read?: (values: V) => unknown;
  write?: (v: unknown, form: UseFormReturn<V>) => void;
};
export type AgentFields<V extends FieldValues> = Record<string, AgentField<V>>;

const set = { shouldDirty: true, shouldValidate: false } as const;
export const setField = <V extends FieldValues, P extends Path<V>>(form: UseFormReturn<V>, field: P, v: unknown) => form.setValue(field, v as PathValue<V, P>, set);

/** The form's values as the agent reads them. */
export function readFields<V extends FieldValues>(form: UseFormReturn<V>, fields: AgentFields<V>): Record<string, unknown> {
  const values = form.getValues();
  return Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.read ? f.read(values) : form.getValues(f.field)]));
}

/** `page_form_fill`: sets the given fields through `setValue` (the args are already validated against the schema). */
export function fillFields<V extends FieldValues>(form: UseFormReturn<V>, fields: AgentFields<V>, values: Record<string, unknown>): PageToolOutcome {
  for (const [k, v] of Object.entries(values)) {
    const f = fields[k];
    if (f.write) f.write(v, form);
    else setField(form, f.field, v);
  }
  return ok({ filled: Object.keys(values) });
}

/** Client-side field errors of the form, keyed by the agent's names. */
export function formErrors<V extends FieldValues>(form: UseFormReturn<V>, fields: AgentFields<V>) {
  // getFieldState reads the live state; `form.formState` is the last render's snapshot (stale right after handleSubmit).
  return Object.entries(fields).flatMap(([k, f]) => {
    const e = form.getFieldState(f.field).error;
    return e ? [{ path: `values.${k}`, code: 'invalid', message: e.message ?? 'invalid' }] : [];
  });
}

/**
 * `page_form_submit`: the form's own `handleSubmit(onValid)` — the same path as the save button. Resolves the client
 * errors when validation stops it; server errors throw and come back as the tool's errors.
 */
export async function submitForm<V extends FieldValues>(form: UseFormReturn<V>, fields: AgentFields<V>, onValid: (v: V) => Promise<unknown>, result: () => unknown): Promise<PageToolOutcome> {
  let saved = false;
  await form.handleSubmit(async (v) => {
    await onValid(v);
    saved = true;
  })();
  if (saved) return ok(result());
  const errors = formErrors(form, fields);
  return { ok: false, errors: errors.length ? errors : [{ path: '', code: 'invalid', message: 'The form is not valid' }] };
}
