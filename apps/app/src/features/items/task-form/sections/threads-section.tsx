import { useState } from 'react';
import { tr } from '@/i18n';
import { Badge, Button, Divider, FlexBox, FlexRow, Icon, Inset, Input, Segmented, SectionCard, showToast, Text } from '@/ui';
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
          <Badge tone="accent" icon="threads">
            {item.threads.done}/{item.threads.total}
          </Badge>
        )
      }
    >
      {existing.length > 0 ? (
        <FlexBox gap="xs">
          {existing.map((t) => (
            <Inset key={t.id}>
              <FlexRow justify="between">
                <Text strike={t.status === 'done'}>{t.title}</Text>
                {t.locked && <Icon name="locked" label={tr('Locked')} />}
              </FlexRow>
            </Inset>
          ))}
        </FlexBox>
      ) : (
        <Text variant="label" tone="muted">
          {tr('Split this task into threads to see them here.')}
        </Text>
      )}
      <Divider />
      <FlexBox gap="sm">
        <Text variant="strong">{tr('Split into threads')}</Text>
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
