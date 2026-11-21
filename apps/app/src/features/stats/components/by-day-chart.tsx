import { useState } from 'react';
import { intlLocale, tr } from '@/i18n';
import { parseIsoDate } from '@/lib/dates';
import { ChartTooltip, FlexBox, Legend, Text } from '@/ui';
import type { StatsView } from '@/contracts/tasker';
import { STATUS_SERIES } from '../stats.constants';

/**
 * @ui ByDayChart
 * @spec Stacked status columns per day (2px gaps, 4px rounded top), recessive baseline, hover/tap shows the day's tally.
 * @keywords bar chart, stacked bars, by day, histogram
 */
export function ByDayChart({ days }: { days: StatsView['byDay'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.completed + d.failed + d.skipped));
  const fmt = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });
  const h = hover !== null ? days[hover] : null;
  return (
    <FlexBox gap="sm">
      <Legend items={STATUS_SERIES.map((s) => ({ key: s.key, label: tr(s.label), color: s.color }))} />
      <div className="relative">
        <div className="flex h-36 items-end gap-0.5 border-b border-line" onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              aria-label={`${d.date}: ${d.completed} / ${d.failed} / ${d.skipped}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              className="flex h-full min-w-0 flex-1 flex-col-reverse gap-0.5"
              style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}
            >
              {STATUS_SERIES.map((s) =>
                d[s.key] > 0 ? <span key={s.key} className="w-full last:rounded-t-control" style={{ height: `${(d[s.key] / max) * 100}%`, background: s.color }} /> : null,
              )}
            </button>
          ))}
        </div>
        {h && (
          <ChartTooltip>
            <Text variant="caption">{fmt.format(parseIsoDate(h.date))}</Text>
            {STATUS_SERIES.map((s) => (
              <Text key={s.key} variant="caption" tone="muted" numeric>
                {`${tr(s.label)}: ${h[s.key]}`}
              </Text>
            ))}
          </ChartTooltip>
        )}
      </div>
      {days.length > 0 && (
        <FlexBox dir="row" justify="between">
          <Text variant="caption" tone="muted">{fmt.format(parseIsoDate(days[0].date))}</Text>
          <Text variant="caption" tone="muted">{fmt.format(parseIsoDate(days[days.length - 1].date))}</Text>
        </FlexBox>
      )}
    </FlexBox>
  );
}
