import { useState } from 'react';
import { intlLocale } from '@/i18n';
import { parseIsoDate } from '@/lib/dates';
import { ChartTooltip, FlexBox, Text } from '@/ui';
import type { StatsView } from '@/contracts/tasker';

const W = 320;
const H = 120;

/**
 * @ui OverTimeChart
 * @spec Success rate (0–100%) over time as a 2px line; gaps where the rate is null; crosshair + value on hover.
 * @keywords line chart, trend, over time, rate
 */
export function OverTimeChart({ points }: { points: StatsView['overTime'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (r: number) => H - r * H;
  const segments: string[] = [];
  let cur = '';
  points.forEach((p, i) => {
    if (p.rate === null) {
      if (cur) segments.push(cur);
      cur = '';
    } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`;
  });
  if (cur) segments.push(cur);
  const fmt = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' });
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 -6 ${W} ${H + 12}`}
        className="h-36 w-full overflow-visible pl-7"
        role="img"
        aria-label="rate"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
        }}
      >
        {[0, 0.5, 1].map((g) => (
          <line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} stroke="var(--t-line)" strokeWidth={1} />
        ))}
        {[1, 0].map((g) => (
          <text key={g} x={-4} y={y(g) + 3} textAnchor="end" fontSize="var(--t-text-micro)" fill="var(--t-muted)">
            {g * 100}%
          </text>
        ))}
        {points.map((p, i) =>
          p.rate !== null && points[i - 1]?.rate == null && points[i + 1]?.rate == null ? <circle key={p.date} cx={x(i)} cy={y(p.rate)} r={3} fill="var(--t-accent)" /> : null,
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--t-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {hp && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--t-muted)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            {hp.rate !== null && <circle cx={x(hover)} cy={y(hp.rate)} r={4} fill="var(--t-accent)" stroke="var(--t-surface)" strokeWidth={2} />}
          </>
        )}
      </svg>
      {hp && (
        <ChartTooltip corner="left">
          <Text variant="caption" numeric>{`${fmt.format(parseIsoDate(hp.date))}: ${hp.rate === null ? '—' : `${Math.round(hp.rate * 100)}%`}`}</Text>
        </ChartTooltip>
      )}
      {n > 0 && (
        <FlexBox dir="row" justify="between">
          <Text variant="caption" tone="muted">{fmt.format(parseIsoDate(points[0].date))}</Text>
          <Text variant="caption" tone="muted">{fmt.format(parseIsoDate(points[n - 1].date))}</Text>
        </FlexBox>
      )}
    </div>
  );
}
