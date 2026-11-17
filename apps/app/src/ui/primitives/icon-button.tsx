import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui IconButton
 * @spec Square icon-only action; `label` is required (aria-label + title). tone: plain | accent.
 * @keywords icon button, close, more, menu, toolbar
 */
const TONE = {
  plain: 'bg-surface-2 text-fg hover:bg-line',
  accent: 'bg-accent text-accent-fg hover:opacity-90',
  bare: 'bg-transparent text-muted hover:bg-surface-2',
} as const;

export function IconButton({ label, icon, tone = 'plain', className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <button type={type} aria-label={label} title={label} className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40', TONE[tone], className)} {...rest}>
      {icon}
    </button>
  );
}
