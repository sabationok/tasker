import { cn } from '@/lib/cn';

/**
 * @ui Segmented
 * @spec One-of-N tabs in a track (role=tablist). options: { value, label }[].
 * @keywords tabs, segmented control, switcher, period
 */
export type Option<V extends string> = { value: V; label: string };

export function Segmented<V extends string>({ options, value, onChange, fill }: { options: Option<V>[]; value: V; onChange: (v: V) => void; fill?: boolean }) {
  return (
    <div role="tablist" className={cn('flex rounded-control bg-sunken p-1', fill && 'min-w-0 flex-1')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('h-control-sm flex-1 truncate rounded-control px-2 text-label transition', o.value === value ? 'bg-surface font-medium text-fg shadow-raised' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
