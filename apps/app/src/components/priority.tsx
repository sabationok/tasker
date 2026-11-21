import { tr } from '@/i18n';
import { Badge, IconTile, NavRow, OptionList, Sheet, type BadgeTone } from '@/ui';
import type { Priority } from '@/contracts/tasker';

/** 0 = «Default» (null on the wire). */
export type PriorityValue = 0 | Priority;
export const PRIORITY_LABEL: Record<PriorityValue, string> = { 0: 'Default', 1: 'High', 2: 'Medium', 3: 'Low' };
/** Priority is shown as a word + a theme tone, never a hard-coded colour. */
const PRIORITY_TONE: Record<PriorityValue, BadgeTone> = { 0: 'neutral', 1: 'negative', 2: 'caution', 3: 'neutral' };

/** @ui PriorityRow @spec Form row + sheet picking a priority. @keywords priority, flag, importance */
export function PriorityRow({ value, onChange, open, setOpen }: { value: PriorityValue; onChange: (v: PriorityValue) => void; open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <>
      <NavRow icon={<IconTile icon="priority" size="sm" />} label={tr('Priority')} value={tr(PRIORITY_LABEL[value])} onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Priority')}>
        <OptionList
          label={tr('Priority')}
          value={value}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
          options={([0, 1, 2, 3] as PriorityValue[]).map((p) => ({ value: p, label: tr(PRIORITY_LABEL[p]), leading: <Badge tone={PRIORITY_TONE[p]} icon="priority" /> }))}
        />
      </Sheet>
    </>
  );
}
