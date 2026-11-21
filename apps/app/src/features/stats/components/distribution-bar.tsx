import { tr } from '@/i18n';
import { FlexBox, Legend } from '@/ui';
import type { Tally } from '@/contracts/tasker';
import { STATUS_SERIES } from '../stats.constants';

/** Percent split of statuses as one segmented bar + legend with values. */
export function DistributionBar({ value }: { value: Tally }) {
  const total = value.completed + value.failed + value.skipped;
  return (
    <FlexBox gap="sm">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-pill bg-line" role="img" aria-label={tr('Status distribution')}>
        {total > 0 &&
          STATUS_SERIES.filter((s) => value[s.key] > 0).map((s) => (
            <div key={s.key} title={`${tr(s.label)}: ${value[s.key]}%`} className="h-full" style={{ width: `${(value[s.key] / total) * 100}%`, background: s.color }} />
          ))}
      </div>
      <Legend items={STATUS_SERIES.map((s) => ({ key: s.key, label: tr(s.label), color: s.color, value: `${value[s.key]}%` }))} />
    </FlexBox>
  );
}
