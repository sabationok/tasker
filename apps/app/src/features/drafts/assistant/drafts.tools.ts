import { localInputToIso } from '@/lib/dates';
import { argString, defineScreenTools, fail, ok, s, type JsonSchema, type PageAction, type PageScope } from '@/lib/page-agent';
import type { DraftFieldError, DraftView, SaveBatchResult } from '@/contracts/tasker';
import { DISCARD_REASONS, draftRows, errorField, fieldOf, toCamel, toSnake, TOOL_LABEL, type DiscardReason } from '../draft.lib';
import { toFormValue, type DraftFormField } from '../draft-form.lib';
import type { DraftReview } from '../review/use-draft-review';
import type { DraftForm } from '../review/use-draft-form';

/*
 * The drafts screens' tools: `drafts.batch` (the batch of Mia's recognised drafts) and `drafts.edit` (one draft's form).
 * Handlers act on the screen's own state: the review's save / dismiss (the same calls as the buttons), the form's
 * setValue, the URL query.
 */

const draftId = s.str('The draft id, from sections.drafts[].draft_id');
const reason = s.enumOf(DISCARD_REASONS, 'Why it is dismissed; it trains the recognizer');
const discardDef = {
  title: 'Dismiss a draft',
  description: 'Dismiss one draft of this batch (nothing is written). Give the reason when known.',
  input: s.obj({ draft_id: draftId, reason }, ['draft_id']),
  destructive: true,
};

export const draftsBatchTools = defineScreenTools('drafts.batch', {
  page_draft_open: { title: 'Open a draft', readOnly: true, description: 'Open one draft in the edit form (nothing is saved).', input: s.obj({ draft_id: draftId }, ['draft_id']) },
  page_draft_discard: discardDef,
  page_batch_save_all: { title: 'Save all drafts', description: 'Save every valid open draft of this batch as is; invalid ones stay with their errors.' },
});

export const draftsEditTools = defineScreenTools('drafts.edit', {
  page_form_fill: {
    title: 'Fill the draft form',
    readOnly: true,
    description: "Set fields of the open draft form. Keys are the draft tool's input fields (snake_case, as in sections.values; only sections.editable). Nothing is saved: the user or page_form_submit saves.",
    input: s.obj({ values: s.any("Field → value, per the draft tool's input") }, ['values']),
    _meta: { valuesOf: 'draft' },
  },
  page_form_submit: { title: 'Save the draft', description: 'Save the open draft with the form values (the same as «Зберегти»); the server validates again.' },
  page_draft_discard: discardDef,
  page_form_close: { title: 'Close the form', readOnly: true, description: 'Leave the form without saving, back to the batch.' },
});

const asErrors = (errs: DraftFieldError[]) => ({ ok: false as const, errors: errs.map((e) => ({ path: e.path ?? '', code: e.code ?? 'invalid', message: e.message })) });

/** `page_draft_discard {draft_id, reason?}` on both screens. */
function discardAction(review: DraftReview, find: (id: string) => DraftView | undefined, after?: () => void): PageAction {
  return async (a) => {
    const id = argString(a, 'draft_id');
    if (typeof id !== 'string') return id;
    const d = find(id);
    if (!d) return fail('No such draft on this screen', 'draft_id', 'not-found:draft');
    const errs = await review.dismiss(d, a.reason as DiscardReason | undefined);
    if (errs) return asErrors(errs);
    after?.();
    return ok({ draft_id: d.id, status: 'discarded' });
  };
}

/** `drafts.batch`: the batch's drafts with their state and errors. */
export function batchScope(batchId: string, review: DraftReview, open: (id: string) => void): PageScope {
  const drafts = review.source.drafts;
  const find = (id: string) => drafts.find((d) => d.id === id);
  return draftsBatchTools.scope({
    title: 'Чернетки пакета',
    params: { batch_id: batchId },
    sections: {
      drafts: drafts.map((d) => ({
        draft_id: d.id,
        tool: d.tool,
        action: TOOL_LABEL[d.tool] ?? d.tool,
        state: review.stateOf(d),
        fields: Object.fromEntries(draftRows(d)),
        computed: d.preview?.computed ?? {},
        warnings: d.preview?.warnings ?? [],
        errors: review.errors[d.id] ?? [],
        result: d.resultLabel,
      })),
    },
    handlers: {
      page_draft_open: (a) => {
        const d = find(a.draft_id as string);
        if (!d) return fail('No such draft in this batch', 'draft_id', 'not-found:draft');
        if (!['pending', 'invalid'].includes(review.stateOf(d))) return fail('This draft is already decided', 'draft_id', 'invalid:draft-closed');
        open(d.id);
        return ok({ screen: 'drafts.edit', draft_id: d.id });
      },
      page_draft_discard: discardAction(review, find),
      page_batch_save_all: review.ready.length
        ? async () => {
            const results: SaveBatchResult = await review.recordAll();
            return ok({ results: results.map((r) => ({ draft_id: r.draftId, status: r.status, errors: r.errors })) });
          }
        : undefined,
    },
  });
}

/** Form value as the agent reads it: the field's natural type back from the control's string. */
function readable(f: DraftFormField, v: string | boolean): unknown {
  if (typeof v === 'boolean' || v === '') return v === '' ? null : v;
  if (f.kind === 'datetime') return localInputToIso(v);
  if (f.kind === 'number' || (f.kind === 'enum' && f.options?.some((o) => typeof o === 'number'))) return Number(v);
  return v;
}

/** A form field's JSON Schema, from the draft tool's own field kinds (so the model sees the real shape). */
function fieldSchema(tool: string, f: DraftFormField): JsonSchema {
  const title = fieldOf(tool, f.key)?.title;
  const base: JsonSchema = (() => {
    switch (f.kind) {
      case 'boolean':
        return s.bool(title);
      case 'number':
        return s.num(title);
      case 'date':
        return s.date(title);
      case 'datetime':
        return s.str(title, { format: 'date-time' });
      case 'enum':
        return f.options?.every((o) => typeof o === 'string') ? s.enumOf(f.options as string[], title) : s.any(title);
      case 'array':
      case 'object':
        return s.any(title);
      default:
        return s.str(title);
    }
  })();
  return f.nullable ? s.nullable(base) : base;
}

/** `drafts.edit`: the open form's values (snake_case), what changed, and the server's field errors. */
export function editScope(edit: DraftForm, review: DraftReview, submit: () => Promise<DraftFieldError[] | null>, close: () => void): PageScope | null {
  const { draft, fields, form } = edit;
  if (!draft) return null;
  const values = form.getValues();
  const editable = fields.filter((f) => f.kind !== 'ref');
  return draftsEditTools.scope({
    title: 'Редагування чернетки',
    params: { batch_id: draft.batchId, draft_id: draft.id },
    sections: {
      draft_id: draft.id,
      tool: draft.tool,
      values: Object.fromEntries(fields.map((f) => [toSnake(f.key), readable(f, values[f.key] ?? '')])),
      editable: editable.map((f) => toSnake(f.key)),
      changed: Object.keys(form.formState.dirtyFields).map(toSnake),
      errors: (review.errors[draft.id] ?? []).map((e) => ({ field: e.path ? toSnake(errorField(e)) : null, message: e.message })),
    },
    inputs: {
      page_form_fill: s.obj({ values: s.obj(Object.fromEntries(editable.map((f) => [toSnake(f.key), fieldSchema(draft.tool, f)])), [], 'Field → value; only the fields to change') }, ['values']),
    },
    handlers: {
      page_form_fill: (a) => {
        const entries = Object.entries(a.values as Record<string, unknown>);
        const unknown = entries.map(([k]) => k).filter((k) => !editable.some((f) => toSnake(f.key) === k));
        if (unknown.length) return { ok: false, errors: unknown.map((k) => ({ path: `values.${k}`, code: 'invalid:args', message: `No editable field ${k}` })) };
        for (const [k, v] of entries) {
          const f = editable.find((x) => x.key === toCamel(k))!;
          form.setValue(f.key, toFormValue(f, v), { shouldDirty: true });
        }
        return ok({ filled: entries.map(([k]) => k) });
      },
      page_form_submit: async () => {
        const errs = await submit();
        return errs ? asErrors(errs) : ok({ draft_id: draft.id, status: 'saved' });
      },
      page_draft_discard: discardAction(review, (id) => (id === draft.id ? draft : undefined), close),
      page_form_close: () => {
        close();
        return ok({ screen: 'drafts.batch' });
      },
    },
  });
}

/** `drafts` with no batch open: only the global tools (navigation); the batch id comes from Mia's launch or a link. */
export const draftsEmptyTools = defineScreenTools('drafts', {});
export const draftsEmptyScope = (): PageScope =>
  draftsEmptyTools.scope({ title: 'Чернетки', sections: { batch: null, note: 'No batch is open; Mia opens one from its chat.' }, handlers: {} });
