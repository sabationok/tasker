import { useState } from 'react';
import { GitBranch, Lock } from 'lucide-react';
import { tr } from '@/i18n';
import { Badge, Button, FlexBox, FlexRow, Input, Segmented, SectionCard, showToast } from '@/ui';
import { ListEditor } from '@/components/list-editor';
import type { ItemView, SubtasksOrder } from '@/contracts/tasker';
import { useItems, useSplitItem } from '../../items.queries';

/** Threads of a saved single task: the current ones, and a split form (POST /items/split). Not a form field: it saves on its own. */
export function ThreadsSection({ item }: { item: ItemView }) {
  const threads = useItems({ parentId: item.id });
  const split = useSplitItem();
  const [order, setOrder] = useState<SubtasksOrder>(item.subtasksOrder);
  const [titles, setTitles] = useState<string[]>(['', '']);
  const existing = threads.data ?? [];

  async function submit() {
    const list = titles.map((t) => t.trim()).filter(Boolean);
    if (!list.length) return;
    await split.mutateAsync({ id: item.id, order, threads: list.map((title) => ({ title })) });
    setTitles(['', '']);
    showToast('Threads created');
    void threads.refetch();
  }

  return (
    <SectionCard
      title={tr('Threads')}
      marker="optional"
      actions={
        item.threads && (
          <Badge tone="accent">
            <GitBranch className="size-3" />
            {item.threads.done}/{item.threads.total}
          </Badge>
        )
      }
    >
      {existing.length > 0 ? (
        <FlexBox gap="xs">
          {existing.map((t) => (
            <FlexRow key={t.id} justify="between" className="rounded-xl border border-line px-3 py-2.5">
              <span className={t.status === 'done' ? 'text-muted line-through' : ''}>{t.title}</span>
              {t.locked && <Lock className="size-4 text-muted" aria-label={tr('Locked')} />}
            </FlexRow>
          ))}
        </FlexBox>
      ) : (
        <p className="text-sm text-muted">{tr('Split this task into threads to see them here.')}</p>
      )}
      <FlexBox gap="sm" className="border-t border-line pt-3">
        <span className="text-sm font-medium">{tr('Split into threads')}</span>
        <Segmented
          value={order}
          onChange={setOrder}
          options={[
            { value: 'any', label: tr('Any order') },
            { value: 'sequential', label: tr('Sequential') },
          ]}
        />
        <ListEditor
          items={titles}
          onChange={setTitles}
          addLabel={tr('Add thread')}
          makeNew={() => ''}
          itemLabel={(i) => tr('Thread {n}', { n: existing.length + i + 1 })}
          renderItem={(v, set, id) => <Input id={id} value={v} onChange={(e) => set(e.target.value)} />}
        />
        <Button variant="secondary" onClick={submit} loading={split.isPending} disabled={!titles.some((t) => t.trim())}>
          {tr('Split')}
        </Button>
      </FlexBox>
    </SectionCard>
  );
}
