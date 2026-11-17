import { tr } from '@/i18n';
import { FlexRow } from '@/ui';
import type { Tally } from '@/contracts/tasker';
import { STATUS_SERIES } from '../stats.constants';

/** @ui StatusLegend @spec Swatch + label (+ optional value) per status series. @keywords legend, chart legend */
export function StatusLegend({ values, suffix = '' }: { values?: Tally; suffix?: string }) {
  return (
    <FlexRow gap="md" wrap className="text-xs text-muted">
      {STATUS_SERIES.map((s) => (
        <FlexRow key={s.key} gap="xs">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
          <span>
            {tr(s.label)}
            {values && <span className="ml-1 font-medium text-fg tabular-nums">{`${values[s.key]}${suffix}`}</span>}
          </span>
        </FlexRow>
      ))}
    </FlexRow>
  );
}
