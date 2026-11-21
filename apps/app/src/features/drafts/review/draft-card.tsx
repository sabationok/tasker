import { tr } from '@/i18n';
import { Badge, Button, FlexBox, FlexRow, KeyValueList, Notice, Surface, Text, type BadgeTone } from '@/ui';
import type { DraftFieldError, DraftView } from '@/contracts/tasker';
import { draftRows, fieldTitle, TOOL_LABEL, type DraftState } from '../draft.lib';

const STATE: Record<DraftState, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Draft', tone: 'accent' },
  saving: { label: 'Saving…', tone: 'neutral' },
  saved: { label: 'Recorded', tone: 'positive' },
  invalid: { label: 'Needs a fix', tone: 'negative' },
  discarded: { label: 'Dismissed', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'caution' },
};
const OPEN: DraftState[] = ['pending', 'invalid'];

/** An error line: the field's title when the path names one. */
const errorText = (d: DraftView, e: DraftFieldError) => (e.path ? `${fieldTitle(d.tool, e.path.split('.')[0])}: ${e.message}` : e.message);

/**
 * One recognised intent, like Mia's intents panel: the action, one row per filled field (schema title → resolved
 * value), the server's computed texts, warnings, field errors; «Зберегти» / «Змінити» / «Відхилити» while open.
 */
export function DraftCard({ draft, state, errors, busy, onSave, onChange, onDismiss }: {
  draft: DraftView;
  state: DraftState;
  errors: DraftFieldError[];
  busy: 'record' | 'dismiss' | null;
  onSave: () => void;
  onChange: () => void;
  onDismiss: () => void;
}) {
  const st = STATE[state];
  const open = OPEN.includes(state);
  const computed = [...new Set(Object.values(draft.preview?.computed ?? {}))];
  const warnings = draft.preview?.warnings ?? [];
  return (
    <Surface as="section">
      <FlexRow justify="between">
        <Text variant="strong">{tr(TOOL_LABEL[draft.tool] ?? draft.tool)}</Text>
        <Badge tone={st.tone}>{tr(st.label)}</Badge>
      </FlexRow>
      <KeyValueList items={draftRows(draft)} />
      {computed.length > 0 && (
        <FlexBox gap="none">
          {computed.map((c) => (
            <Text key={c} variant="caption" tone="muted">
              {c}
            </Text>
          ))}
        </FlexBox>
      )}
      {open && warnings.length > 0 && <Notice messages={warnings} />}
      {state === 'invalid' &&
        errors.map((e, i) => (
          <Text key={i} variant="label" tone="danger">
            {errorText(draft, e)}
          </Text>
        ))}
      {state === 'saved' && (
        <Text variant="label" tone="positive">
          {tr('Recorded in «Tasker»: {label}', { label: draft.resultLabel ?? '' })}
        </Text>
      )}
      {state === 'discarded' && draft.reason && (
        <Text variant="caption" tone="muted">
          {tr('Reason: {reason}', { reason: tr(REASON_TEXT[draft.reason] ?? draft.reason) })}
        </Text>
      )}
      {open && (
        <FlexRow gap="sm">
          <Button variant="ghost" block onClick={onDismiss} loading={busy === 'dismiss'} disabled={!!busy}>
            {tr('Dismiss')}
          </Button>
          <Button variant="secondary" block onClick={onChange} disabled={!!busy}>
            {tr('Change')}
          </Button>
          <Button block onClick={onSave} loading={busy === 'record'} disabled={!!busy}>
            {tr('Save')}
          </Button>
        </FlexRow>
      )}
    </Surface>
  );
}

const REASON_TEXT: Record<string, string> = { wrong_connector: 'Wrong connector', wrong_tool: 'Wrong action', wrong_values: 'Wrong values' };
