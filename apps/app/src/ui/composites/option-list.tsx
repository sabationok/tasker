import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FlexBox } from '../layout/flex';
import { Text } from '../primitives/text';
import { Icon } from '../theme/icons';

/**
 * @ui OptionList
 * @spec Single-choice list (radiogroup): label, optional description and leading node, a check on the selected one.
 * @keywords radio, select, choose, option list, picker
 */
export type ListOption<V extends string | number> = { value: V; label: string; description?: string; leading?: ReactNode };

export function OptionList<V extends string | number>({ options, value, onChange, label }: { options: ListOption<V>[]; value: V | null | undefined; onChange: (v: V) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="overflow-hidden rounded-control border border-line bg-surface">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('flex w-full items-center gap-3 border-t border-line px-row py-3 text-left transition first:border-0 hover:bg-sunken', o.value === value && 'bg-accent-soft')}
        >
          {o.leading}
          <FlexBox fill gap="none">
            <Text>{o.label}</Text>
            {o.description && (
              <Text variant="label" tone="muted">
                {o.description}
              </Text>
            )}
          </FlexBox>
          {o.value === value && <Icon name="check" />}
        </button>
      ))}
    </div>
  );
}
