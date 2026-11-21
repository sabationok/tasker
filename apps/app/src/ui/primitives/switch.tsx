import { cn } from '@/lib/cn';

/** @ui Switch @spec Controlled on/off toggle (role=switch). @keywords switch, toggle, boolean, on off */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-toggle w-[calc(var(--t-toggle)*1.75)] shrink-0 rounded-pill transition', checked ? 'bg-accent' : 'bg-line')}
    >
      <span
        className="absolute top-[3px] size-[calc(var(--t-toggle)-6px)] rounded-pill bg-surface shadow-raised transition-all"
        style={{ left: checked ? 'calc(var(--t-toggle) * 0.75 + 3px)' : '3px' }}
      />
    </button>
  );
}
