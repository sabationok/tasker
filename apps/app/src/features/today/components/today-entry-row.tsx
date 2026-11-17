import { GitBranch, ListChecks, Repeat } from 'lucide-react';
import { tr } from '@/i18n';
import { formatSeconds } from '@/lib/dates';
import { Badge, DoneToggle, FlexBox, FlexRow, type DoneState } from '@/ui';
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

/**
 * @ui TodayEntryRow
 * @spec One Today row: category icon, title, type + counters (checklist, threads, habit value), done toggle.
 * @keywords today row, task row, habit row, entry
 */
export function TodayEntryRow({ entry, busy, onOpen, onToggle, onChecklist }: { entry: TodayEntry; busy: boolean; onOpen: () => void; onToggle: () => void; onChecklist?: () => void }) {
  const state = entryState(entry);
  const value = entry.habit && habitValue(entry.habit);
  return (
    <FlexRow gap="md" className="rounded-2xl bg-surface p-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <CategoryIcon category={entry.category} />
        <FlexBox fill gap="xs">
          <span className={state === 'done' ? 'truncate text-[15px] text-muted line-through' : 'truncate text-[15px] font-medium'}>{entry.title}</span>
          <FlexRow gap="xs" wrap>
            <Badge>{entry.type === 'habit' ? tr('Habit') : tr('Task')}</Badge>
            {entry.source === 'occurrence' && (
              <Badge>
                <Repeat className="size-3" />
              </Badge>
            )}
            {entry.slot !== undefined && entry.slot > 0 && <Badge>{`${entry.slot}:00`}</Badge>}
            {entry.threads && (
              <Badge tone="accent">
                <GitBranch className="size-3" />
                {entry.threads.done}/{entry.threads.total}
              </Badge>
            )}
            {value && <Badge tone="accent">{value}</Badge>}
            {entry.late && <Badge tone="warning">{tr('late')}</Badge>}
          </FlexRow>
        </FlexBox>
      </button>
      {entry.checklist && (
        <button type="button" onClick={onChecklist} disabled={!onChecklist} className="shrink-0" aria-label={tr('Checklist')}>
          <Badge tone="accent">
            <ListChecks className="size-3" />
            {entry.checklist.done}/{entry.checklist.total}
          </Badge>
        </button>
      )}
      <DoneToggle state={state} busy={busy} onClick={onToggle} label={entry.title} />
    </FlexRow>
  );
}
