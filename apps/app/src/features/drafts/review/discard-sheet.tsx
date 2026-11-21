import { useState } from 'react';
import { tr } from '@/i18n';
import { Chip, FlexBox, ScrollRow, Sheet, Text } from '@/ui';
import { DISCARD_REASON_LABEL, DISCARD_REASONS, type DiscardReason } from '../draft.lib';

/** «Відхилити» asks why (training signal for the agent): wrong connector / wrong action / wrong values; the reason is optional. */
export function DiscardSheet({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: (reason?: DiscardReason) => void }) {
  const [reason, setReason] = useState<DiscardReason | undefined>();
  return (
    <Sheet
      open
      onClose={onCancel}
      title={tr('Why dismiss?')}
      actions={[
        { label: tr('Cancel'), variant: 'secondary', onClick: onCancel },
        { label: tr('Dismiss'), onClick: () => onConfirm(reason), loading: busy },
      ]}
    >
      <FlexBox gap="sm">
        <Text variant="label" tone="muted">
          {tr('It helps the agent learn.')}
        </Text>
        <ScrollRow label={tr('Why dismiss?')}>
          {DISCARD_REASONS.map((r) => (
            <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? undefined : r)}>
              {tr(DISCARD_REASON_LABEL[r])}
            </Chip>
          ))}
        </ScrollRow>
      </FlexBox>
    </Sheet>
  );
}
