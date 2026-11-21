import { tr } from '@/i18n';
import { formatSeconds } from '@/lib/dates';
import { Badge, DoneToggle, FlexRow, ListRow, ListRowMeta, Text, type DoneState } from '@/ui';
import { CategoryIcon } from '@/features/categories/category-icon';
import type { TodayEntry } from '@/contracts/tasker';

const STATE_BY_STATUS: Record<NonNullable<TodayEntry['status']>, DoneState> = { done: 'done', skipped: 'skipped', failed: 'failed' };

export function entryState(e: TodayEntry): DoneState {
  if (e.done) return 'done';
  if (e.status) return STATE_BY_STATUS[e.status];
  if (e.habit?.value) return 'partial';
  return 'open';
}

const isTime = (ev: string) => ev === 'timer' || ev === 'stopwatch';
function habitValue(h: NonNullable<TodayEntry['habit']>): string | null {
  if (h.evaluation === 'yes_no' || h.evaluation === 'checklist') return null;
  const fmt = (v: number | null) => (v === null ? '—' : isTime(h.evaluation) ? formatSeconds(v) : String(v));
  return h.target !== null ? `${fmt(h.value ?? 0)} / ${fmt(h.target)}${h.unit ? ` ${h.unit}` : ''}` : fmt(h.value);
}

/** One Today entry: category icon, title, type + counters (checklist, threads, habit value), done toggle. */
export function TodayEntryRow({ entry, busy, onOpen, onToggle, onChecklist }: { entry: TodayEntry; busy: boolean; onOpen: () => void; onToggle: () => void; onChecklist?: () => void }) {
  const state = entryState(entry);
  const value = entry.habit && habitValue(entry.habit);
  return (
    <ListRow
      onPress={onOpen}
      leading={<CategoryIcon category={entry.category} />}
      trailing={
        <FlexRow gap="sm">
          {entry.checklist && (
            <button type="button" onClick={onChecklist} disabled={!onChecklist} aria-label={tr('Checklist')}>
              <Badge tone="accent" icon="checklist">
                {entry.checklist.done}/{entry.checklist.total}
              </Badge>
            </button>
          )}
          <DoneToggle state={state} busy={busy} onClick={onToggle} label={entry.title} />
        </FlexRow>
      }
    >
      <Text variant="strong" strike={state === 'done'} truncate>
        {entry.title}
      </Text>
      <ListRowMeta>
        <Badge>{entry.type === 'habit' ? tr('Habit') : tr('Task')}</Badge>
        {entry.source === 'occurrence' && <Badge icon="periodic" />}
        {entry.slot !== undefined && entry.slot > 0 && <Badge>{`${entry.slot}:00`}</Badge>}
        {entry.threads && (
          <Badge tone="accent" icon="threads">
            {entry.threads.done}/{entry.threads.total}
          </Badge>
        )}
        {value && <Badge tone="accent">{value}</Badge>}
        {entry.late && <Badge tone="caution">{tr('late')}</Badge>}
      </ListRowMeta>
    </ListRow>
  );
}
