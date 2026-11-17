import { Flag } from 'lucide-react';
import { tr } from '@/i18n';
import { IconTile, NavRow, OptionList, Sheet } from '@/ui';
import type { Priority } from '@/contracts/tasker';

/** 0 = «Default» (null on the wire). */
export type PriorityValue = 0 | Priority;
export const PRIORITY_LABEL: Record<PriorityValue, string> = { 0: 'Default', 1: 'High', 2: 'Medium', 3: 'Low' };
const PRIORITY_COLOR: Record<PriorityValue, string> = { 0: '#a1a1aa', 1: '#e5484d', 2: '#f5a524', 3: '#3e63dd' };

/** @ui PriorityRow @spec Form row + sheet picking a priority. @keywords priority, flag, importance */
export function PriorityRow({ value, onChange, open, setOpen }: { value: PriorityValue; onChange: (v: PriorityValue) => void; open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <>
      <NavRow
        icon={
          <IconTile color={PRIORITY_COLOR[value]} size={36}>
            <Flag className="size-4" />
          </IconTile>
        }
        label={tr('Priority')}
        value={tr(PRIORITY_LABEL[value])}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Priority')}>
        <OptionList
          label={tr('Priority')}
          value={value}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
          options={([0, 1, 2, 3] as PriorityValue[]).map((p) => ({
            value: p,
            label: tr(PRIORITY_LABEL[p]),
            leading: <Flag className="size-4" style={{ color: PRIORITY_COLOR[p] }} />,
          }))}
        />
      </Sheet>
    </>
  );
}
