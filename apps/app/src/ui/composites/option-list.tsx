import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FlexBox } from '../layout/flex';

/**
 * @ui OptionList
 * @spec Single-choice list (radiogroup): label, optional description and leading node, check on the selected one.
 * @keywords radio, select, choose, option list, picker
 */
export type ListOption<V extends string | number> = { value: V; label: string; description?: string; leading?: ReactNode };

export function OptionList<V extends string | number>({ options, value, onChange, label }: { options: ListOption<V>[]; value: V | null | undefined; onChange: (v: V) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="overflow-hidden rounded-xl border border-line bg-surface">
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-2', i > 0 && 'border-t border-line', o.value === value && 'bg-accent-soft/60')}
        >
          {o.leading}
          <FlexBox fill gap="none">
            <span className="text-[15px] text-fg">{o.label}</span>
            {o.description && <span className="text-[13px] text-muted">{o.description}</span>}
          </FlexBox>
          {o.value === value && <Check className="size-4 text-accent" />}
        </button>
      ))}
    </div>
  );
}
