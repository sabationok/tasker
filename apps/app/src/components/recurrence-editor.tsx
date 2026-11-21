import { tr } from '@/i18n';
import { Field, FlexBox, FlexRow, Input, OptionList, Segmented, ToggleGrid } from '@/ui';
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

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
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
          <Field fill label={tr('Every N hours')}>
            <Input type="number" min={1} max={12} value={r.everyHours} onChange={(e) => onChange({ ...r, everyHours: int(e.target.value, 1, 12) })} />
          </Field>
          <Field fill label={tr('From')}>
            <Input type="time" value={r.from} onChange={(e) => onChange({ ...r, from: e.target.value })} />
          </Field>
          <Field fill label={tr('To')}>
            <Input type="time" value={r.to} onChange={(e) => onChange({ ...r, to: e.target.value })} />
          </Field>
        </FlexRow>
      );
    case 'weekly':
      return (
        <ToggleGrid
          label={tr('Weekly')}
          required
          value={r.weekdays}
          onChange={(v) => onChange({ ...r, weekdays: sorted(v) })}
          options={WEEKDAYS.map((d, i) => ({ value: i + 1, label: tr(d) }))}
        />
      );
    case 'monthly':
      return (
        <Field label={tr('Days of month')}>
          <ToggleGrid label={tr('Days of month')} required value={r.monthDays} onChange={(v) => onChange({ ...r, monthDays: sorted(v) })} options={MONTH_DAYS} />
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
