import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** @ui Select @spec Native select with the kit's control look; options: { value, label }[]. @keywords select, dropdown, enum, choose */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; invalid?: boolean }>(function Select(
  { options, invalid, className, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn('h-control w-full rounded-control border border-line bg-surface px-3 text-body text-fg outline-none focus:border-accent', invalid && 'border-negative', className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
