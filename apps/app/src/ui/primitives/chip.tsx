import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** @ui Chip @spec Selectable pill (aria-pressed); optional count. @keywords chip, pill, filter, tag */
export function Chip({ active, onClick, children, count }: { active?: boolean; onClick?: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition',
        active ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2',
      )}
    >
      {children}
      {count !== undefined && <span className={cn('text-xs', active ? 'opacity-80' : 'text-muted')}>{count}</span>}
    </button>
  );
}
