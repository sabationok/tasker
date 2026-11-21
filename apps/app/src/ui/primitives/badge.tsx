import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';

/** @ui Badge @spec Small static label with an optional icon. tone: neutral | accent | positive | negative | caution. @keywords badge, label, status, counter */
const TONE = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-accent-soft text-fg',
  positive: 'bg-sunken text-positive',
  negative: 'bg-sunken text-negative',
  caution: 'bg-sunken text-caution',
} as const;
export type BadgeTone = keyof typeof TONE;

export const Badge = ({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: IconName; children?: ReactNode }) => (
  <span className={cn('inline-flex h-5 items-center gap-1 rounded-control px-1.5 text-micro font-medium tabular-nums', TONE[tone])}>
    {icon && <Icon name={icon} size="xs" />}
    {children}
  </span>
);
