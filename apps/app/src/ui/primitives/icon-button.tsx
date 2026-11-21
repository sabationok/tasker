import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';
import { Spinner } from './spinner';

/**
 * @ui IconButton
 * @spec Icon-only action; `label` is required (aria-label + title). tone: plain | accent | bare | danger.
 * @keywords icon button, close, back, toolbar
 */
const TONE = {
  plain: 'bg-sunken text-fg hover:bg-line',
  accent: 'bg-accent text-accent-fg hover:opacity-90',
  bare: 'bg-transparent text-muted hover:bg-sunken',
  danger: 'bg-transparent text-negative hover:bg-sunken',
} as const;

export function IconButton({ label, icon, tone = 'plain', loading, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName; tone?: keyof typeof TONE; loading?: boolean }) {
  return (
    <button type={type} aria-label={label} title={label} className={cn('inline-flex size-icon-btn shrink-0 items-center justify-center rounded-pill transition disabled:opacity-40', TONE[tone], className)} {...rest}>
      {loading ? <Spinner /> : <Icon name={icon} size="md" />}
    </button>
  );
}
