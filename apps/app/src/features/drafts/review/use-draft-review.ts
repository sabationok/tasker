import { useState } from 'react';
import { tr } from '@/i18n';
import { ApiError } from '@/lib/api/api-error';
import type { DraftResult } from '@/lib/host';
import type { DraftFieldError, DraftView, SaveBatchResult } from '@/contracts/tasker';
import { diffDto, draftState, type DiscardReason } from '../draft.lib';

/**
 * Where a review's drafts come from and where decisions go: REST in the mini app, `callServerTool` in the MCP App.
 * `save` takes the edited DTO (camelCase) when the user changed it; `discard` takes the reason (both are training signal).
 */
export type DraftSource = {
  drafts: DraftView[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  save: (draftId: string, dto?: Record<string, unknown>) => Promise<{ id?: string }>;
  discard: (draftId: string, reason?: DiscardReason) => Promise<void>;
  saveAll: () => Promise<SaveBatchResult>;
};

const toErrors = (e: unknown): DraftFieldError[] =>
  e instanceof ApiError ? (e.errors.length ? e.errors : [{ message: e.message }]) : [{ message: e instanceof Error && e.message ? e.message : tr('Something went wrong') }];

/** Review state over a source: per-draft errors and busy flags, and the actions with their training outcome. */
export function useDraftReview(source: DraftSource, onDecision: (d: DraftResult) => void) {
  const [errors, setErrors] = useState<Record<string, DraftFieldError[]>>({});
  const [busy, setBusy] = useState<Record<string, 'record' | 'dismiss'>>({});
  const [savingAll, setSavingAll] = useState(false);

  const mark = (id: string, b: 'record' | 'dismiss' | null) =>
    setBusy((m) => {
      const n = { ...m };
      if (b) n[id] = b;
      else delete n[id];
      return n;
    });
  const stateOf = (d: DraftView) => draftState(d, errors[d.id]);
  const ready = source.drafts.filter((d) => stateOf(d) === 'pending');
  const open = source.drafts.filter((d) => ['pending', 'invalid'].includes(stateOf(d)));
  const setDraftErrors = (id: string, errs: DraftFieldError[]) => setErrors((m) => ({ ...m, [id]: errs }));

  /** Save as is, or with an edited DTO. Resolves `null` when saved, else the field errors (also kept in `errors`). */
  async function record(d: DraftView, dto?: Record<string, unknown>): Promise<DraftFieldError[] | null> {
    const changes = dto ? diffDto(d.dto, dto) : [];
    const edited = changes.length > 0;
    mark(d.id, 'record');
    try {
      const res = await source.save(d.id, edited ? dto : undefined);
      setDraftErrors(d.id, []);
      onDecision({ draftId: d.id, status: 'saved', id: res.id, outcome: edited ? 'edited' : 'accepted', ...(edited ? { changes } : {}) });
      return null;
    } catch (e) {
      const errs = toErrors(e);
      setDraftErrors(d.id, errs);
      return errs;
    } finally {
      mark(d.id, null);
    }
  }
  async function dismiss(d: DraftView, reason?: DiscardReason): Promise<DraftFieldError[] | null> {
    mark(d.id, 'dismiss');
    try {
      await source.discard(d.id, reason);
      onDecision({ draftId: d.id, status: 'discarded', outcome: 'dismissed', ...(reason ? { reason } : {}) });
      return null;
    } catch (e) {
      const errs = toErrors(e);
      setDraftErrors(d.id, errs);
      return errs;
    } finally {
      mark(d.id, null);
    }
  }
  async function recordAll(): Promise<SaveBatchResult> {
    setSavingAll(true);
    try {
      const results = await source.saveAll();
      const next: Record<string, DraftFieldError[]> = {};
      for (const r of results) {
        if (r.status === 'saved') onDecision({ draftId: r.draftId, status: 'saved', outcome: 'accepted' });
        if (r.status === 'invalid') next[r.draftId] = r.errors ?? [];
      }
      setErrors((m) => ({ ...m, ...next }));
      return results;
    } finally {
      setSavingAll(false);
    }
  }

  return {
    source,
    errors,
    setDraftErrors,
    stateOf,
    ready,
    open,
    savingAll,
    busyOf: (d: DraftView): 'record' | 'dismiss' | null => busy[d.id] ?? (savingAll && ready.includes(d) ? 'record' : null),
    record,
    dismiss,
    recordAll,
    recordAllLabel: `${tr('Save all')} (${ready.length})`,
  };
}
export type DraftReview = ReturnType<typeof useDraftReview>;
