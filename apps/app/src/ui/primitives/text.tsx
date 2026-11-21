import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Text
 * @spec All typography: variant (title | heading | body | strong | label | caption | overline) × tone (default | muted | danger | positive).
 * Screens never set font sizes, weights or ink themselves.
 * @keywords text, heading, title, label, caption, typography
 */
const VARIANT = {
  title: 'text-title font-strong',
  heading: 'text-heading font-strong',
  body: 'text-body',
  strong: 'text-body font-medium',
  label: 'text-label',
  caption: 'text-caption',
  overline: 'text-micro font-medium uppercase tracking-wide',
} as const;
const TONE = { default: 'text-fg', muted: 'text-muted', danger: 'text-negative', positive: 'text-positive', caution: 'text-caution' } as const;
const TAG: Record<keyof typeof VARIANT, ElementType> = { title: 'h1', heading: 'h2', body: 'p', strong: 'span', label: 'span', caption: 'span', overline: 'span' };

export type TextVariant = keyof typeof VARIANT;
export function Text({ variant = 'body', tone = 'default', as, strike, truncate, clamp, numeric, children, className, htmlFor }: {
  variant?: TextVariant;
  tone?: keyof typeof TONE;
  as?: ElementType;
  strike?: boolean;
  truncate?: boolean;
  /** Show at most 2 lines. */
  clamp?: boolean;
  numeric?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const C = as ?? TAG[variant];
  return <C htmlFor={htmlFor} className={cn(VARIANT[variant], TONE[strike ? 'muted' : tone], strike && 'line-through', truncate && 'truncate', clamp && 'line-clamp-2', numeric && 'tabular-nums', className)}>{children}</C>;
}
