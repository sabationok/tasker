import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { Field, FlexBox, FlexRow, Input, OptionList, Segmented } from '@/ui';
import type { Freq, Recurrence } from '@/contracts/tasker';

/** A fresh value per frequency, with the server's defaults. */
export const RECURRENCE_DEFAULTS: { [F in Freq]: Extract<Recurrence, { freq: F }> } = {
  hourly: { freq: 'hourly', everyHours: 1, from: '08:00', to: '20:00' },
  daily: { freq: 'daily' },
  weekly: { freq: 'weekly', weekdays: [1, 2, 3, 4, 5] },
  monthly: { freq: 'monthly', monthDays: [1] },
  every_n_days: { freq: 'every_n_days', interval: 2 },
  days_per_period: { freq: 'days_per_period', count: 3, period: 'week' },
  yearly_dates: { freq: 'yearly_dates', dates: ['01-01'] },
};

const FREQ_LABEL: Record<Freq, string> = {
  hourly: 'Hourly (every day)',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  every_n_days: 'Repeat (every N days)',
  days_per_period: 'Some days per period',
  yearly_dates: 'Specific days of the year',
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const toggleIn = (xs: number[], x: number) => (xs.includes(x) ? xs.filter((v) => v !== x) : [...xs, x].sort((a, b) => a - b));
const int = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(v) || min)));

/**
 * @ui RecurrenceEditor
 * @spec Edits one `Recurrence` (spec §6.2): the frequency list, then that frequency's fields. Shared by periodic tasks and habits.
 * @keywords recurrence, repeat, frequency, schedule, weekly, monthly
 */
export function RecurrenceEditor({ value, onChange }: { value: Recurrence; onChange: (r: Recurrence) => void }) {
  return (
    <FlexBox gap="md">
      <Field label={tr('Frequency')}>
        <OptionList
          label={tr('Frequency')}
          value={value.freq}
          onChange={(f) => f !== value.freq && onChange(RECURRENCE_DEFAULTS[f])}
          options={(Object.keys(FREQ_LABEL) as Freq[]).map((f) => ({ value: f, label: tr(FREQ_LABEL[f]) }))}
        />
      </Field>
      <FreqFields value={value} onChange={onChange} />
    </FlexBox>
  );
}

function FreqFields({ value: r, onChange }: { value: Recurrence; onChange: (r: Recurrence) => void }) {
  switch (r.freq) {
    case 'hourly':
      return (
        <FlexRow gap="sm" align="end">
          <Field label={tr('Every N hours')}>
            <Input type="number" min={1} max={12} value={r.everyHours} onChange={(e) => onChange({ ...r, everyHours: int(e.target.value, 1, 12) })} />
          </Field>
          <Field label={tr('From')}>
            <Input type="time" value={r.from} onChange={(e) => onChange({ ...r, from: e.target.value })} />
          </Field>
          <Field label={tr('To')}>
            <Input type="time" value={r.to} onChange={(e) => onChange({ ...r, to: e.target.value })} />
          </Field>
        </FlexRow>
      );
    case 'weekly':
      return (
        <div className="grid grid-cols-7 gap-1" role="group" aria-label={tr('Weekly')}>
          {WEEKDAYS.map((d, i) => {
            const on = r.weekdays.includes(i + 1);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = toggleIn(r.weekdays, i + 1);
                  if (next.length) onChange({ ...r, weekdays: next });
                }}
                className={cn('h-10 rounded-xl text-sm', on ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg')}
              >
                {tr(d)}
              </button>
            );
          })}
        </div>
      );
    case 'monthly':
      return (
        <Field label={tr('Days of month')}>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const on = r.monthDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = toggleIn(r.monthDays, d);
                    if (next.length) onChange({ ...r, monthDays: next });
                  }}
                  className={cn('h-9 rounded-lg text-sm', on ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg')}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
      );
    case 'every_n_days':
      return (
        <Field label={tr('Every N days')}>
          <Input type="number" min={2} max={365} value={r.interval} onChange={(e) => onChange({ ...r, interval: int(e.target.value, 2, 365) })} />
        </Field>
      );
    case 'days_per_period':
      return (
        <FlexBox gap="sm">
          <Field label={tr('Days per period')}>
            <Input type="number" min={1} max={31} value={r.count} onChange={(e) => onChange({ ...r, count: int(e.target.value, 1, 31) })} />
          </Field>
          <Segmented
            value={r.period}
            onChange={(period) => onChange({ ...r, period })}
            options={[
              { value: 'week', label: tr('week') },
              { value: 'month', label: tr('month') },
            ]}
          />
        </FlexBox>
      );
    case 'yearly_dates':
      return (
        <Field label={tr('Dates (MM-DD, comma separated)')}>
          <Input
            defaultValue={r.dates.join(', ')}
            onBlur={(e) => {
              const dates = e.target.value
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter((s) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s));
              if (dates.length) onChange({ ...r, dates });
            }}
          />
        </Field>
      );
    case 'daily':
      return null;
  }
}
