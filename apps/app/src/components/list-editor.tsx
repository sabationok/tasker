import { useId, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { tr } from '@/i18n';
import { Button, Field, FlexBox, FlexRow, IconButton } from '@/ui';

/**
 * @ui ListEditor
 * @spec An ordered, editable list: each row renders its own control, with move up / down / delete; «add» appends `makeNew()`.
 * @keywords checklist editor, reminders editor, repeatable rows, field array, ordered list
 */
export function ListEditor<T>({ items, onChange, makeNew, renderItem, addLabel, itemLabel, orderable = true }: {
  items: T[];
  onChange: (items: T[]) => void;
  makeNew: () => T;
  /** `id` links the row's control to its label (pass it to the input). */
  renderItem: (item: T, set: (next: T) => void, id: string, index: number) => ReactNode;
  addLabel: string;
  itemLabel?: (index: number) => string;
  orderable?: boolean;
}) {
  const baseId = useId();
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <FlexBox gap="sm">
      {items.map((item, i) => (
        <Field key={i} label={itemLabel?.(i)} htmlFor={`${baseId}-${i}`}>
          <FlexRow gap="xs">
            <div className="min-w-0 flex-1">{renderItem(item, (n) => onChange(items.map((x, j) => (j === i ? n : x))), `${baseId}-${i}`, i)}</div>
            {orderable && (
              <>
                <IconButton label="↑" tone="bare" disabled={i === 0} icon={<ArrowUp className="size-4" />} onClick={() => move(i, -1)} />
                <IconButton label="↓" tone="bare" disabled={i === items.length - 1} icon={<ArrowDown className="size-4" />} onClick={() => move(i, 1)} />
              </>
            )}
            <IconButton label={tr('Delete')} tone="bare" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </FlexRow>
        </Field>
      ))}
      <Button variant="ghost" icon={<Plus className="size-4" />} onClick={() => onChange([...items, makeNew()])}>
        {addLabel}
      </Button>
    </FlexBox>
  );
}
