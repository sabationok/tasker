import { DoneMark } from '../primitives/done-toggle';
import { Text } from '../primitives/text';

/**
 * @ui ToggleRow
 * @spec A tappable line with a done indicator (checklist lines, sub-items). aria-pressed.
 * @keywords checklist line, toggle row, checkbox row, sub-item
 */
export function ToggleRow({ label, on, busy, onToggle }: { label: string; on: boolean; busy?: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={on} disabled={busy} onClick={onToggle} className="flex w-full items-center justify-between gap-3 rounded-control border border-line bg-surface px-row py-3 text-left disabled:opacity-50">
      <Text strike={on}>{label}</Text>
      <DoneMark state={on ? 'done' : 'open'} busy={busy} />
    </button>
  );
}
