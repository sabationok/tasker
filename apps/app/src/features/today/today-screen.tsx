import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { intlLocale, tr } from '@/i18n';
import { addDays, formatDay, parseIsoDate, today } from '@/lib/dates';
import { routes } from '@/lib/routes';
import { useAppQuery } from '@/lib/use-app-query';
import { DatePickerButton, EmptyState, FlexBox, FlexRow, ListGroup, PageHeader, ProgressBar, QueryState, Text } from '@/ui';
import { usePageAgent } from '@/lib/page-agent';
import { useCompleteItem, useItems, useSkipOccurrence, useUncompleteItem } from '@/features/items/items.queries';
import { useAgents } from '@/features/agents/agents.queries';
import { AssigneeChips } from '@/features/agents/assignee-chips';
import { ChecklistSheet } from '@/features/items/checklist-sheet';
import { useCheckIn } from '@/features/habits/habits.queries';
import { CheckInSheet } from '@/features/habits/check-in-sheet';
import type { TodayEntry } from '@/contracts/tasker';
import { useStrip, useToday } from './today.queries';
import { DayStrip } from './components/day-strip';
import { CategoryChips } from './components/category-chips';
import { TodayEntryRow } from './components/today-entry-row';
import { todayScope } from './assistant/today.tools';
import { AgentAsksBlock } from './components/agent-asks-block';
import { USER_ASSIGNEE } from '@/contracts/tasker';

/** Monday of the week holding `date` (the strip shows Mon–Sun). */
function weekStart(date: string): string {
  const wd = (parseIsoDate(date).getDay() + 6) % 7;
  return addDays(date, -wd);
}

/** Today: the strip, category chips, progress, entries with their done toggles. Date and category live in the URL. */
export function TodayScreen() {
  const navigate = useNavigate();
  const { query, patch } = useAppQuery<{ date: string; category: string; assignee: string }>();
  const date = query.date ?? today();
  const from = weekStart(date);
  const strip = useStrip(from, addDays(from, 6));
  const day = useToday(date, query.category);
  const agents = useAgents();
  const entries = useAssigneeFilter(day.data?.entries, query.assignee);

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
  const skip = useSkipOccurrence();

  usePageAgent(
    todayScope({
      date,
      category: query.category,
      assignee: query.assignee,
      agents,
      data: day.data,
      entries,
      patch,
      open,
      complete: complete.mutateAsync,
      uncomplete: uncomplete.mutateAsync,
      skip: skip.mutateAsync,
      checkIn: checkIn.mutateAsync,
    }),
  );

  const data = day.data;
  return (
    <FlexBox gap="md">
      <PageHeader
        title={date === today() ? tr('Today') : formatDay(date, intlLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
        action={<DatePickerButton label={tr('Date')} value={date} onChange={(d) => patch({ date: d })} />}
      />
      <DayStrip
        days={strip.data ?? []}
        selected={date}
        onSelect={(d) => patch({ date: d === today() ? undefined : d })}
        onShift={(w) => patch({ date: addDays(date, w * 7) })}
      />
      {date === today() && <AgentAsksBlock agents={agents} />}
      <QueryState isLoading={day.isLoading} error={day.error} onRetry={() => day.refetch()}>
        {data && (
          <>
            <CategoryChips categories={data.categories} value={query.category} onChange={(c) => patch({ category: c })} />
            <AssigneeChips agents={agents} value={query.assignee} onChange={(a) => patch({ assignee: a })} />
            <FlexBox gap="xs">
              <FlexRow justify="between">
                <Text variant="overline" tone="muted">
                  {tr('Completed {n}', { n: `${data.progress.done}/${data.progress.total}` })}
                </Text>
                <Text variant="overline" tone="muted" numeric>
                  {data.progress.percent}%
                </Text>
              </FlexRow>
              <ProgressBar percent={data.progress.percent} label={tr('Progress')} />
            </FlexBox>
            {entries.length === 0 ? (
              <EmptyState title={query.assignee ? tr('Nothing for this assignee on this day.') : tr('Nothing planned for this day.')} />
            ) : (
              <ListGroup label={tr('Today')}>
                {entries.map((e) => (
                    <TodayEntryRow
                      key={e.key}
                      entry={e}
                      busy={busyKey === e.key}
                      onOpen={() => open(e)}
                      onToggle={() => toggle(e)}
                      onChecklist={e.source === 'task' ? () => setChecklistEntry(e) : undefined}
                    />
                ))}
              </ListGroup>
            )}
          </>
        )}
      </QueryState>
      {checkInEntry && <CheckInSheet entry={checkInEntry} onClose={() => setCheckInEntry(null)} />}
      {checklistEntry && <ChecklistSheet itemId={checklistEntry.itemId!} title={checklistEntry.title} onClose={() => setChecklistEntry(null)} />}
    </FlexBox>
  );
}

/**
 * The day's entries narrowed to one assignee. `/today` has no assignee filter yet (TODO(server)), so the ids come from
 * `/items/many?assignee=`: habits are always the user's; tasks and occurrences match by `itemId`.
 */
function useAssigneeFilter(entries: TodayEntry[] | undefined, assignee: string | undefined): TodayEntry[] {
  const items = useItems({ type: 'task', assignee }, !!assignee);
  if (!entries) return [];
  if (!assignee) return entries;
  const ids = new Set((items.data ?? []).map((i) => i.id));
  return entries.filter((e) => (e.source === 'habit' ? assignee === USER_ASSIGNEE : !!e.itemId && ids.has(e.itemId)));
}
