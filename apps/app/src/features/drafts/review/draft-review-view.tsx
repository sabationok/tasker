import { tr } from '@/i18n';
import { EmptyState, FlexBox, FlexUl, QueryState, SheetFooter, Text } from '@/ui';
import type { DraftView } from '@/contracts/tasker';
import { DraftCard } from './draft-card';
import type { DraftReview } from './use-draft-review';

/** The batch: a count line, the cards, and «Зберегти всі» as a page button when the host has no main button. */
export function DraftReviewView({ review, pageButton, onChange, onDismiss }: { review: DraftReview; pageButton: boolean; onChange: (d: DraftView) => void; onDismiss: (d: DraftView) => void }) {
  const { source, errors } = review;
  return (
    <QueryState isLoading={source.isLoading} error={source.error} onRetry={source.refetch}>
      {source.drafts.length === 0 ? (
        <EmptyState icon="drafts" title={tr('No drafts in this batch.')} />
      ) : (
        <FlexBox gap="md">
          <Text variant="label" tone="muted">
            {tr('{open} to review, {total} in total', { open: review.open.length, total: source.drafts.length })}
          </Text>
          <FlexUl gap="sm">
            {source.drafts.map((d) => (
              <li key={d.id}>
                <DraftCard
                  draft={d}
                  state={review.stateOf(d)}
                  errors={errors[d.id] ?? []}
                  busy={review.busyOf(d)}
                  onSave={() => void review.record(d)}
                  onChange={() => onChange(d)}
                  onDismiss={() => onDismiss(d)}
                />
              </li>
            ))}
          </FlexUl>
          {pageButton && review.ready.length > 0 && <SheetFooter actions={[{ label: review.recordAllLabel, onClick: () => void review.recordAll(), loading: review.savingAll }]} />}
        </FlexBox>
      )}
    </QueryState>
  );
}
