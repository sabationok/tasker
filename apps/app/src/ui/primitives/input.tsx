import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Input / Textarea
 * @spec Text controls with the kit's surface; no label or error inside (that is Field).
 * @keywords input, text field, textarea, number, date, time
 */
const BASE = 'w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-fg outline-none placeholder:text-muted focus:border-accent';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cn(BASE, 'h-11', invalid && 'border-danger', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(BASE, 'resize-none py-2.5', className)} {...rest} />;
});
