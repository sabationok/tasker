import { useEffect, useMemo, useRef } from 'react';
import { host } from '@/lib/host';
import { usePageAgent } from '@/lib/page-agent';
import { draftsEmptyScope } from '../assistant/drafts.tools';
import { useAppQuery } from '@/lib/use-app-query';
import { FlexBox, TopBar } from '@/ui';
import { useBatch, useDiscardDraft, useSaveBatch, useSaveDraft } from '../drafts.queries';
import { BatchIdForm } from './batch-id-form';
import { DraftReviewFlow, REVIEW_TITLE } from './draft-review-flow';
import type { DraftSource } from './use-draft-review';

/**
 * The mini app (Mia's WebView, `/drafts?batchId=[&draftId=]`): the review over REST. Decisions go to the host
 * (`sendResult`), the open screen is described to Mia's agent, «Зберегти всі» rides the host's MainButton.
 */
export function DraftReviewScreen() {
  const { query, patch } = useAppQuery<{ batchId: string; draftId: string }>();
  const batchId = query.batchId ?? host.launch.batchId;
  const batch = useBatch(batchId);
  const save = useSaveDraft();
  const discard = useDiscardDraft();
  const saveAll = useSaveBatch();
  const only = host.launch.batchId === batchId ? host.launch.draftIds : undefined;

  const source = useMemo<DraftSource>(
    () => ({
      drafts: (batch.data ?? []).filter((d) => !only?.length || only.includes(d.id)),
      isLoading: batch.isLoading,
      error: batch.error,
      refetch: () => void batch.refetch(),
      save: async (draftId, dto) => {
        const r = await save.mutateAsync({ draftId, dto });
        return { id: typeof r.id === 'string' ? r.id : undefined };
      },
      discard: async (draftId, reason) => void (await discard.mutateAsync({ draftId, reason })),
      saveAll: () => saveAll.mutateAsync(batchId!),
    }),
    // mutateAsync identities are stable; the batch query drives re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batch.data, batch.isLoading, batch.error, batchId, only],
  );

  usePageAgent(batchId ? null : draftsEmptyScope());

  if (!batchId)
    return (
      <FlexBox gap="md">
        <TopBar title={REVIEW_TITLE()} />
        <BatchIdForm />
      </FlexBox>
    );
  return (
    <DraftReviewFlow
      batchId={batchId}
      source={source}
      onDecision={(d) => host.sendResult(d)}
      editingId={query.draftId ?? null}
      onOpen={(id) => patch({ draftId: id })}
      onClose={() => patch({ draftId: undefined })}
      title={REVIEW_TITLE()}
      pageButton={host.type === 'browser'}
      agent
    >
      {(review) => <MainButton text={!query.draftId && review.ready.length > 0 ? review.recordAllLabel : null} onClick={() => void review.recordAll()} busy={review.savingAll} />}
    </DraftReviewFlow>
  );
}

/** Drives the host's MainButton (Mia / Telegram); renders nothing. */
function MainButton({ text, onClick, busy }: { text: string | null; onClick: () => void; busy: boolean }) {
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
  return null;
}
