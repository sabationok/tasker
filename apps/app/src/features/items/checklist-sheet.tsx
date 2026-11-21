import { tr } from '@/i18n';
import { FlexBox, QueryState, Sheet, ToggleRow } from '@/ui';
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
            const busy = toggle.isPending && toggle.variables?.id === line.id;
            return <ToggleRow key={line.id} label={line.title} on={line.done} busy={busy} onToggle={() => toggle.mutate({ id: line.id }, { onSuccess: () => item.refetch() })} />;
          })}
        </FlexBox>
      </QueryState>
    </Sheet>
  );
}
