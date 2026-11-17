import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { intlLocale, tr } from '@/i18n';
import { addDays, formatDay, parseIsoDate, today } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { EmptyState, FlexBox, FlexRow, FlexUl, ProgressBar, QueryState } from '@/ui';
import { useCompleteItem, useUncompleteItem } from '@/features/items/items.queries';
import { ChecklistSheet } from '@/features/items/checklist-sheet';
import { useCheckIn } from '@/features/habits/habits.queries';
import { CheckInSheet } from '@/features/habits/check-in-sheet';
import type { TodayEntry } from '@/contracts/tasker';
import { useStrip, useToday } from './today.queries';
import { DayStrip } from './components/day-strip';
import { CategoryChips } from './components/category-chips';
import { TodayEntryRow } from './components/today-entry-row';

/** Monday of the week holding `date` (the strip shows Mon–Sun). */
function weekStart(date: string): string {
  const wd = (parseIsoDate(date).getDay() + 6) % 7;
  return addDays(date, -wd);
}

/** Today: the strip, category chips, progress, entries with their done toggles. Date and category live in the URL. */
export function TodayScreen() {
  const navigate = useNavigate();
  const { query, patch } = useAppQuery<{ date: string; category: string }>();
  const date = query.date ?? today();
  const from = weekStart(date);
  const strip = useStrip(from, addDays(from, 6));
  const day = useToday(date, query.category);

  const complete = useCompleteItem();
  const uncomplete = useUncompleteItem();
  const checkIn = useCheckIn();
  const [checkInEntry, setCheckInEntry] = useState<TodayEntry | null>(null);
  const [checklistEntry, setChecklistEntry] = useState<TodayEntry | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const busyKey = (complete.isPending || uncomplete.isPending || checkIn.isPending) && pendingKey;
  function toggle(e: TodayEntry) {
    setPendingKey(e.key);
    if (e.source === 'habit') {
      if (e.habit?.evaluation !== 'yes_no') return setCheckInEntry(e);
      return checkIn.mutate({ habitId: e.habitId!, date: e.date, slot: e.slot, status: e.done ? 'none' : 'done' });
    }
    const target = { id: e.itemId!, ...(e.source === 'occurrence' ? { date: e.date, slot: e.slot } : {}) };
    (e.done ? uncomplete : complete).mutate(target);
  }
  const open = (e: TodayEntry) => navigate(e.source === 'habit' ? routes.habitEdit(e.habitId!) : routes.taskEdit(e.itemId!));

  const data = day.data;
  return (
    <FlexBox gap="md">
      <FlexRow justify="between">
        <h1 className="text-xl font-semibold">{date === today() ? tr('Today') : formatDay(date, intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
        <label className="relative inline-flex size-9 items-center justify-center rounded-full bg-surface-2" title={tr('Date')}>
          <CalendarDays className="size-4" />
          <input type="date" aria-label={tr('Date')} value={date} onChange={(e) => e.target.value && patch({ date: e.target.value })} className="absolute inset-0 opacity-0" />
        </label>
      </FlexRow>
      <DayStrip
        days={strip.data ?? []}
        selected={date}
        onSelect={(d) => patch({ date: d === today() ? undefined : d })}
        onShift={(w) => patch({ date: addDays(date, w * 7) })}
      />
      <QueryState isLoading={day.isLoading} error={day.error} onRetry={() => day.refetch()}>
        {data && (
          <>
            <CategoryChips completed={data.completed} categories={data.categories} value={query.category} onChange={(c) => patch({ category: c })} />
            <FlexBox gap="xs">
              <FlexRow justify="between" className="text-xs font-medium uppercase tracking-wide text-muted">
                <span>{tr('Progress')}</span>
                <span>{data.progress.percent}%</span>
              </FlexRow>
              <ProgressBar percent={data.progress.percent} label={tr('Progress')} />
            </FlexBox>
            {data.entries.length === 0 ? (
              <EmptyState title={tr('Nothing planned for this day.')} />
            ) : (
              <FlexUl gap="sm">
                {data.entries.map((e) => (
                  <li key={e.key}>
                    <TodayEntryRow
                      entry={e}
                      busy={busyKey === e.key}
                      onOpen={() => open(e)}
                      onToggle={() => toggle(e)}
                      onChecklist={e.source === 'task' ? () => setChecklistEntry(e) : undefined}
                    />
                  </li>
                ))}
              </FlexUl>
            )}
          </>
        )}
      </QueryState>
      {checkInEntry && <CheckInSheet entry={checkInEntry} onClose={() => setCheckInEntry(null)} />}
      {checklistEntry && <ChecklistSheet itemId={checklistEntry.itemId!} title={checklistEntry.title} onClose={() => setChecklistEntry(null)} />}
    </FlexBox>
  );
}
