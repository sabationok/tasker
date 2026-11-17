import { tr } from '@/i18n';
import { FlexBox } from '@/ui';
import type { Tally } from '@/contracts/tasker';
import { STATUS_SERIES } from '../stats.constants';
import { StatusLegend } from './status-legend';

/** @ui DistributionBar @spec Percent split of statuses as one segmented bar (2px gaps) + legend with values. @keywords distribution, share, stacked bar */
export function DistributionBar({ value }: { value: Tally }) {
  const total = value.completed + value.failed + value.skipped;
  return (
    <FlexBox gap="sm">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-line" role="img" aria-label={tr('Status distribution')}>
        {total > 0 &&
          STATUS_SERIES.filter((s) => value[s.key] > 0).map((s) => (
            <div key={s.key} title={`${tr(s.label)}: ${value[s.key]}%`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(value[s.key] / total) * 100}%`, background: s.color }} />
          ))}
      </div>
      <StatusLegend values={value} suffix="%" />
    </FlexBox>
  );
}
