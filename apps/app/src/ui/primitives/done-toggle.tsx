import { Check, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

/**
 * @ui DoneToggle
 * @spec Round done / not-done control for a Today row. state: open | done | partial | skipped | failed.
 * @keywords checkbox, done, complete, toggle, check
 */
export type DoneState = 'open' | 'done' | 'partial' | 'skipped' | 'failed';
const LOOK: Record<DoneState, string> = {
  open: 'border-2 border-line bg-surface-2',
  done: 'bg-success text-white',
  partial: 'border-2 border-success bg-success/15 text-success',
  skipped: 'bg-surface-2 text-muted',
  failed: 'bg-danger text-white',
};
const ICON: Record<DoneState, ReactNode> = {
  open: null,
  done: <Check className="size-4" strokeWidth={3} />,
  partial: <Minus className="size-4" strokeWidth={3} />,
  skipped: <Minus className="size-4" />,
  failed: <X className="size-4" strokeWidth={3} />,
};

export function DoneToggle({ state, onClick, label, busy, disabled }: { state: DoneState; onClick: () => void; label: string; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state === 'done'}
      disabled={busy || disabled}
      onClick={onClick}
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50', LOOK[state])}
    >
      {busy ? <Spinner /> : ICON[state]}
    </button>
  );
}
