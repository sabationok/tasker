import { tr } from '@/i18n';
import type { StatsView } from '@/contracts/tasker';

/** @ui StatTiles @spec Summary: success rate + completed / skipped / failed as hero numbers. @keywords stat tile, kpi, summary */
export function StatTiles({ summary }: { summary: StatsView['summary'] }) {
  const tiles = [
    { label: 'Success rate', value: summary.successRate === null ? 'N/A' : `${Math.round(summary.successRate * 100)}%` },
    { label: 'Completed', value: summary.completed },
    { label: 'Skipped', value: summary.skipped },
    { label: 'Failed', value: summary.failed },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{tr(t.label)}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}
