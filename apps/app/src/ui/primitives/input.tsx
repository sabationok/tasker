import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Input / Textarea
 * @spec Text controls; no label or error inside (that is Field). `width="narrow"` for short numbers.
 * @keywords input, text field, textarea, number, date, time
 */
const BASE = 'w-full rounded-control border border-line bg-surface px-3 text-body text-fg outline-none placeholder:text-muted focus:border-accent';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; width?: 'full' | 'narrow' }>(function Input({ className, invalid, width = 'full', ...rest }, ref) {
  return <input ref={ref} className={cn(BASE, 'h-control', invalid && 'border-negative', width === 'narrow' && 'w-24 shrink-0', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(BASE, 'resize-none py-2.5', className)} {...rest} />;
});
