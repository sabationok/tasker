import { useState } from 'react';
import { tr } from '@/i18n';
import type { DraftResult } from '@/lib/host';
import { usePageAgent } from '@/lib/page-agent';
import { FlexBox, TopBar } from '@/ui';
import type { DraftFieldError, DraftView } from '@/contracts/tasker';
import { batchScope, editScope } from '../assistant/drafts.tools';
import { DraftEditView } from './draft-edit-view';
import { DraftReviewView } from './draft-review-view';
import { DiscardSheet } from './discard-sheet';
import { useDraftForm } from './use-draft-form';
import { useDraftReview, type DraftReview, type DraftSource } from './use-draft-review';

export type DraftReviewFlowProps = {
  batchId: string;
  source: DraftSource;
  /** Every decision with its training signal (outcome, changes, reason). */
  onDecision: (d: DraftResult) => void;
  /** Which draft is open in the form (the mini app keeps it in the URL, the MCP App in state). */
  editingId: string | null;
  onOpen: (draftId: string) => void;
  onClose: () => void;
  title: string;
  /** «Зберегти всі» as a page button (hosts without a main button). */
  pageButton: boolean;
  /** Describe the screen to the host's agent (Mia's WebView only). */
  agent: boolean;
  /** Gets the review, e.g. to drive a host's main button. */
  children?: (review: DraftReview) => React.ReactNode;
};

/** The whole review: the batch, the «Змінити» form, the «Відхилити» reason, and (in Mia) the page agent context. */
export function DraftReviewFlow({ batchId, source, onDecision, editingId, onOpen, onClose, title, pageButton, agent, children }: DraftReviewFlowProps) {
  const review = useDraftReview(source, onDecision);
  const editing = editingId ? source.drafts.find((d) => d.id === editingId) ?? null : null;
  const edit = useDraftForm(editing);
  edit.form.watch(); // re-render on typing, so the agent's context follows the form
  const [discarding, setDiscarding] = useState<DraftView | null>(null);

  /** «Зберегти» in the form: local checks (numbers, JSON), then the server's validation of the edited DTO. */
  async function submit(): Promise<DraftFieldError[] | null> {
    if (!editing) return [{ message: 'No draft open' }];
    const { dto, errors } = edit.build();
    if (errors.length) {
      review.setDraftErrors(editing.id, errors);
      return errors;
    }
    const errs = await review.record(editing, dto);
    if (!errs) onClose();
    return errs;
  }

  usePageAgent(agent ? (editing ? editScope(edit, review, submit, onClose) : batchScope(batchId, review, onOpen)) : null);

  return (
    <FlexBox gap="md">
      {editing ? (
        <DraftEditView edit={edit} errors={review.errors[editing.id] ?? []} saving={review.busyOf(editing) === 'record'} onBack={onClose} onSubmit={() => void submit()} />
      ) : (
        <>
          <TopBar title={title} />
          <DraftReviewView review={review} pageButton={pageButton} onChange={(d) => onOpen(d.id)} onDismiss={setDiscarding} />
        </>
      )}
      {discarding && (
        <DiscardSheet
          busy={review.busyOf(discarding) === 'dismiss'}
          onCancel={() => setDiscarding(null)}
          onConfirm={async (reason) => {
            const errs = await review.dismiss(discarding, reason);
            setDiscarding(null);
            if (!errs && editing?.id === discarding.id) onClose();
          }}
        />
      )}
      {children?.(review)}
    </FlexBox>
  );
}

/** Title for a review screen. */
export const REVIEW_TITLE = () => tr('Check what Mia recognised');
