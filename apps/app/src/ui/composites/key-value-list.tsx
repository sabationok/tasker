import { Text } from '../primitives/text';

/** @ui KeyValueList @spec Label / value pairs in two columns. @keywords key value, definition list, properties */
export const KeyValueList = ({ items }: { items: [string, string][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
    {items.map(([k, v]) => (
      <div key={k} className="contents">
        <Text variant="label" tone="muted" as="dt">
          {k}
        </Text>
        <Text variant="label" as="dd" truncate>
          {v}
        </Text>
      </div>
    ))}
  </dl>
);
