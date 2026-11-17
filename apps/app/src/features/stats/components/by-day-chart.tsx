import { useState } from 'react';
import { intlLocale, tr } from '@/i18n';
import { parseIsoDate } from '@/lib/dates';
import { FlexBox } from '@/ui';
import type { StatsView } from '@/contracts/tasker';
import { STATUS_SERIES } from '../stats.constants';
import { StatusLegend } from './status-legend';

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
      <StatusLegend />
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
                d[s.key] > 0 ? <span key={s.key} className="w-full last:rounded-t" style={{ height: `${(d[s.key] / max) * 100}%`, background: s.color }} /> : null,
              )}
            </button>
          ))}
        </div>
        {h && (
          <div className="pointer-events-none absolute top-0 right-0 rounded-lg border border-line bg-surface px-2 py-1 text-xs shadow">
            <div className="font-medium">{fmt.format(parseIsoDate(h.date))}</div>
            {STATUS_SERIES.map((s) => (
              <div key={s.key} className="text-muted">
                {tr(s.label)}: <span className="text-fg tabular-nums">{h[s.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {days.length > 0 && (
        <div className="flex justify-between text-[11px] text-muted">
          <span>{fmt.format(parseIsoDate(days[0].date))}</span>
          <span>{fmt.format(parseIsoDate(days[days.length - 1].date))}</span>
        </div>
      )}
    </FlexBox>
  );
}
