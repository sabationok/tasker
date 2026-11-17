import { cn } from '@/lib/cn';

/**
 * @ui Segmented
 * @spec One-of-N tabs in a pill track (role=tablist). options: { value, label }[].
 * @keywords tabs, segmented control, switcher, period
 */
export type Option<V extends string> = { value: V; label: string };

export function Segmented<V extends string>({ options, value, onChange, className }: { options: Option<V>[]; value: V; onChange: (v: V) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn('h-8 flex-1 rounded-lg px-2 text-sm transition', o.value === value ? 'bg-surface font-medium text-fg shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
