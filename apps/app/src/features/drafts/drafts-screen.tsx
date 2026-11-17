import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileClock } from 'lucide-react';
import { intlLocale, tr } from '@/i18n';
import { formatDay } from '@/lib/dates';
import { host } from '@/lib/host';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { Badge, Button, EmptyState, Field, FlexBox, FlexForm, FlexRow, FlexUl, IconButton, Input, QueryState, SheetFooter, type BadgeTone } from '@/ui';
import type { DraftStatus, DraftView } from '@/contracts/tasker';
import { useBatch, useDiscardDraft, useSaveBatch, useSaveDraft } from './drafts.queries';

const STATUS: Record<DraftStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'accent' },
  saved: { label: 'Saved', tone: 'success' },
  discarded: { label: 'Discarded', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'warning' },
};

/** What a draft is about, from its tool input (create_item → title, create_habit → name, …). */
function draftTitle(d: DraftView): string {
  const dto = d.dto as Record<string, unknown>;
  return String(dto.title ?? dto.name ?? dto.text ?? d.tool);
}

/**
 * Batch review (`?batchId=`): the drafts Mia's dry runs left, save / discard each, «Save all» on the host's main button
 * (or a page button in a plain browser). Each decision goes back to the host through `sendResult`.
 */
export function DraftsScreen() {
  const navigate = useNavigate();
  const { query } = useAppQuery<{ batchId: string }>();
  const batchId = query.batchId;
  const batch = useBatch(batchId);
  const save = useSaveDraft();
  const discard = useDiscardDraft();
  const saveAll = useSaveBatch();
  const drafts = batch.data ?? [];
  const open = drafts.filter((d) => d.status === 'draft').length;

  async function onSaveAll() {
    if (!batchId) return;
    const results = await saveAll.mutateAsync(batchId);
    for (const r of results) if (r.status === 'saved') host.sendResult({ draftId: r.draftId, status: 'saved' });
    const invalid = results.filter((r) => r.status === 'invalid');
    if (invalid.length) host.alert(invalid.flatMap((r) => r.errors?.map((e) => e.message) ?? []).join('\n'));
  }

  useMainButton(open > 0 ? `${tr('Save all')} (${open})` : null, onSaveAll, saveAll.isPending);

  return (
    <FlexBox gap="md">
      <FlexRow justify="between">
        <IconButton label={tr('Close')} icon={<ChevronLeft className="size-5" />} onClick={() => navigate(routes.today())} />
        <h1 className="text-[17px] font-semibold">{tr('Drafts')}</h1>
        <span className="size-9" />
      </FlexRow>
      {!batchId ? (
        <BatchIdForm />
      ) : (
        <QueryState isLoading={batch.isLoading} error={batch.error} onRetry={() => batch.refetch()}>
          {drafts.length === 0 ? (
            <EmptyState icon={<FileClock className="size-8" />} title={tr('No drafts in this batch.')} />
          ) : (
            <FlexUl gap="sm">
              {drafts.map((d) => (
                <li key={d.id}>
                  <DraftCard
                    draft={d}
                    busy={(save.isPending && save.variables === d.id) || (discard.isPending && discard.variables === d.id)}
                    onSave={() => save.mutateAsync(d.id).then((r) => host.sendResult({ draftId: d.id, status: 'saved', id: (r as { id?: string }).id }))}
                    onDiscard={() => discard.mutateAsync(d.id).then(() => host.sendResult({ draftId: d.id, status: 'discarded' }))}
                  />
                </li>
              ))}
            </FlexUl>
          )}
          {host.type === 'browser' && open > 0 && <SheetFooter actions={[{ label: `${tr('Save all')} (${open})`, onClick: onSaveAll, loading: saveAll.isPending }]} />}
        </QueryState>
      )}
    </FlexBox>
  );
}

function DraftCard({ draft, busy, onSave, onDiscard }: { draft: DraftView; busy: boolean; onSave: () => void; onDiscard: () => void }) {
  const st = STATUS[draft.status];
  const computed = Object.entries(draft.preview?.computed ?? {});
  const warnings = draft.preview?.warnings ?? [];
  return (
    <FlexBox gap="sm" className="rounded-2xl bg-surface p-4">
      <FlexRow justify="between" align="start">
        <FlexBox gap="xs" fill>
          <span className="font-medium">{draftTitle(draft)}</span>
          <FlexRow gap="xs" wrap>
            <Badge>{draft.tool}</Badge>
            <Badge tone={st.tone}>{tr(st.label)}</Badge>
            <Badge>{formatDay(draft.createdAt.slice(0, 10), intlLocale, { day: 'numeric', month: 'short' })}</Badge>
          </FlexRow>
        </FlexBox>
      </FlexRow>
      {computed.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {computed.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {warnings.length > 0 && (
        <ul className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {draft.status === 'draft' && (
        <FlexRow gap="sm">
          <Button variant="secondary" block onClick={onDiscard} disabled={busy}>
            {tr('Discard')}
          </Button>
          <Button block onClick={onSave} loading={busy}>
            {tr('Save')}
          </Button>
        </FlexRow>
      )}
    </FlexBox>
  );
}

/** Without `?batchId=` (plain browser, dev): paste one. */
function BatchIdForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  return (
    <FlexForm
      gap="sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) navigate(routes.drafts(value.trim()));
      }}
    >
      <Field label={tr('Batch id')} htmlFor="batch-id">
        <Input id="batch-id" value={value} onChange={(e) => setValue(e.target.value)} placeholder="01a1…" />
      </Field>
      <Button type="submit">{tr('Open batch')}</Button>
    </FlexForm>
  );
}

/** Drives the host's MainButton (Mia / Telegram); no-op in a plain browser. */
function useMainButton(text: string | null, onClick: () => void, busy: boolean) {
  const handler = useRef(onClick);
  handler.current = onClick;
  useEffect(() => {
    const btn = host.mainButton();
    if (!btn) return;
    if (!text) {
      btn.hide();
      return;
    }
    const click = () => handler.current();
    btn.setText(text);
    btn.show();
    btn.onClick(click);
    return () => {
      btn.offClick(click);
      btn.hide();
    };
  }, [text]);
  useEffect(() => {
    const btn = host.mainButton();
    if (!btn) return;
    if (busy) btn.showProgress();
    else btn.hideProgress();
  }, [busy]);
}
