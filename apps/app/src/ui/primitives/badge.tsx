import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** @ui Badge @spec Small static label. tone: neutral | accent | warning | success | danger. @keywords badge, label, status, counter */
const TONE = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-warning/15 text-warning',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
} as const;
export type BadgeTone = keyof typeof TONE;

export const Badge = ({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium', TONE[tone], className)}>{children}</span>
);
