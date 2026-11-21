import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';

/** @ui PriorityMark @spec A small coloured diamond + the priority word. level: high | mid | low. @keywords priority, importance, severity */
const LEVEL = { high: 'bg-priority-high', mid: 'bg-priority-mid', low: 'bg-priority-low' } as const;
export type PriorityLevel = keyof typeof LEVEL;
export const PriorityMark = ({ level, label }: { level: PriorityLevel; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-caption font-medium text-fg">
    <span aria-hidden className={cn('size-2 rotate-45 rounded-[2px]', LEVEL[level])} />
    {label}
  </span>
);

/** @ui DueChip @spec Clock icon + a relative date («завтра, 10:00»). @keywords due, deadline, date chip, time left */
export const DueChip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-caption text-muted">
    <Icon name="clock" size="xs" />
    {children}
  </span>
);

/** @ui MetaRow / MetaItem @spec A quiet row of icon + count/value pairs (reminders, checklist, threads). @keywords meta, counters, icons row */
export const MetaRow = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>;
export const MetaItem = ({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-caption text-muted" title={label}>
    <Icon name={icon} size="xs" label={label} />
    {children}
  </span>
);

/** @ui ProgressLine @spec Thin progress line with an `x/n` caption above it. @keywords progress, subtasks, checklist progress */
export const ProgressLine = ({ done, total, label }: { done: number; total: number; label: string }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-caption text-muted">
      <span>{label}</span>
      <span className="tabular-nums">{`${done}/${total}`}</span>
    </div>
    <div role="progressbar" aria-label={label} aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} className="h-1 overflow-hidden rounded-pill bg-line">
      <div className="h-full rounded-pill bg-progress" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  </div>
);
