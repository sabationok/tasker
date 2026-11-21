import type { ReactNode } from 'react';
import { Text } from '../primitives/text';

/** @ui StatTiles @spec A grid of label + hero value tiles. @keywords stat tile, kpi, summary, metric */
export const StatTiles = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className="grid grid-cols-2 gap-3">
    {items.map((t) => (
      <div key={t.label} className="rounded-control bg-sunken px-row py-2.5">
        <Text variant="overline" tone="muted" as="dt">
          {t.label}
        </Text>
        <Text variant="title" as="dd" numeric>
          {t.value}
        </Text>
      </div>
    ))}
  </dl>
);
