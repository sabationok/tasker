import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';
import { Spinner } from './spinner';

/**
 * @ui Button
 * @spec One button for every action. variant: primary | secondary | ghost | danger; size: sm | md | lg; block fills the row; icon by name.
 * @keywords button, action, submit, cta
 */
const VARIANT = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-sunken text-fg hover:bg-line',
  ghost: 'bg-transparent text-fg hover:bg-accent-soft',
  danger: 'bg-transparent text-negative hover:bg-accent-soft',
} as const;
const SIZE = { sm: 'h-control-sm px-3 text-label', md: 'h-control px-4 text-label', lg: 'h-control-lg px-4 text-body' } as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof SIZE; block?: boolean; loading?: boolean; icon?: IconName };

export function Button({ variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn('inline-flex min-w-0 items-center justify-center gap-2 rounded-control font-medium transition disabled:opacity-50', VARIANT[variant], SIZE[size], block && 'w-full flex-1', className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      {children && <span className="truncate">{children}</span>}
    </button>
  );
}
