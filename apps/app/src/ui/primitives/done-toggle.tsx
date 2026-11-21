import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';
import { Spinner } from './spinner';

/**
 * @ui DoneToggle
 * @spec Done / not-done control for a row. state: open | done | partial | skipped | failed. Look comes from the `done` / `open` tokens.
 * @keywords checkbox, done, complete, toggle, check
 */
export type DoneState = 'open' | 'done' | 'partial' | 'skipped' | 'failed';
const LOOK: Record<DoneState, string> = {
  open: 'border-2 border-open',
  done: 'bg-done text-done-fg',
  partial: 'border-2 border-done text-fg',
  skipped: 'bg-sunken text-muted',
  failed: 'border-2 border-negative text-negative',
};
const GLYPH: Record<DoneState, IconName | null> = { open: null, done: 'check', partial: 'partial', skipped: 'partial', failed: 'failed' };

const BASE = 'inline-flex size-toggle shrink-0 items-center justify-center rounded-pill transition';

/** @ui DoneMark @spec The same indicator, not interactive (inside a row that is the button). @keywords done mark, check indicator */
export function DoneMark({ state, busy }: { state: DoneState; busy?: boolean }) {
  const glyph = GLYPH[state];
  return <span aria-hidden className={cn(BASE, LOOK[state])}>{busy ? <Spinner /> : glyph && <Icon name={glyph} />}</span>;
}

export function DoneToggle({ state, onClick, label, busy, disabled }: { state: DoneState; onClick?: () => void; label: string; busy?: boolean; disabled?: boolean }) {
  const glyph = GLYPH[state];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state === 'done'}
      disabled={busy || disabled}
      onClick={onClick}
      className={cn(BASE, 'disabled:opacity-50', LOOK[state])}
    >
      {busy ? <Spinner /> : glyph && <Icon name={glyph} />}
    </button>
  );
}
