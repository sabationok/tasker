import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** @ui Chip @spec Selectable pill (aria-pressed); optional count. @keywords chip, pill, filter, tag */
export function Chip({ active, onClick, children, count }: { active?: boolean; onClick?: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-pill border px-3 text-label transition', active ? 'border-selected bg-selected text-selected-fg' : 'border-line bg-surface text-fg hover:bg-sunken')}
    >
      {children}
      {count !== undefined && <span className={cn('text-caption tabular-nums', !active && 'text-muted')}>{count}</span>}
    </button>
  );
}
