import { Check } from 'lucide-react';
import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { FlexBox, QueryState, Sheet } from '@/ui';
import { useItem, useToggleChecklist } from './items.queries';

/**
 * @ui ChecklistSheet
 * @spec A single task's checklist, each line toggled in place (/checklist/toggle).
 * @keywords checklist, sub-items, todo lines
 */
export function ChecklistSheet({ itemId, title, onClose }: { itemId: string | null; title: string; onClose: () => void }) {
  const item = useItem(itemId ?? undefined);
  const toggle = useToggleChecklist();
  if (!itemId) return null;
  return (
    <Sheet open onClose={onClose} title={title || tr('Checklist')}>
      <QueryState isLoading={item.isLoading} error={item.error}>
        <FlexBox gap="xs">
          {(item.data?.checklist ?? []).map((line) => {
            const on = line.done;
            const busy = toggle.isPending && toggle.variables?.id === line.id;
            return (
              <button
                key={line.id}
                type="button"
                aria-pressed={on}
                disabled={busy}
                onClick={() => toggle.mutate({ id: line.id }, { onSuccess: () => item.refetch() })}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-3 text-left disabled:opacity-50"
              >
                <span className={on ? 'text-muted line-through' : ''}>{line.title}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-full', on ? 'bg-success text-white' : 'border-2 border-line')}>{on && <Check className="size-4" />}</span>
              </button>
            );
          })}
        </FlexBox>
      </QueryState>
    </Sheet>
  );
}
