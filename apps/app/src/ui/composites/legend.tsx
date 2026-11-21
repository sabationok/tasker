import { Text } from '../primitives/text';

/** @ui Legend @spec Swatch + label (+ value) per series; colours are theme tokens. @keywords legend, chart legend, series */
export const Legend = ({ items }: { items: { key: string; label: string; color: string; value?: string }[] }) => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
    {items.map((s) => (
      <li key={s.key} className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-control" style={{ background: s.color }} />
        <Text variant="caption" tone="muted">
          {s.label}
        </Text>
        {s.value && (
          <Text variant="caption" numeric>
            {s.value}
          </Text>
        )}
      </li>
    ))}
  </ul>
);
