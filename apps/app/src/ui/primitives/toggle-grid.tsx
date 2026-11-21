import { cn } from '@/lib/cn';

/**
 * @ui ToggleGrid
 * @spec Multi-select grid of small options (weekdays, days of month); keeps at least one selected when `required`.
 * @keywords multi select, weekday picker, day grid, toggle buttons
 */
export function ToggleGrid<V extends string | number>({ options, value, onChange, label, required }: { options: { value: V; label: string }[]; value: V[]; onChange: (v: V[]) => void; label: string; required?: boolean }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const next = on ? value.filter((v) => v !== o.value) : [...value, o.value];
              if (!required || next.length) onChange(next);
            }}
            className={cn('h-control-sm rounded-control text-label transition', on ? 'bg-selected text-selected-fg' : 'bg-sunken text-fg hover:bg-line')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
