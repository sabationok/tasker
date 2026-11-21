import { defineScreenTools, fail, ok, s, type PageScope } from '@/lib/page-agent';
import { today } from '@/lib/dates';
import type { CheckInInput, HabitView } from '@/contracts/tasker';

/* `habits`: active / archived habits (tab in the URL). Archive / restore are the rows' own buttons; check-in is the same call as Today's. */

const habitId = s.str('The habit id, from sections.habits[].id');

export const habitsTools = defineScreenTools('habits', {
  page_habits_filter: { title: 'Switch the list', readOnly: true, description: 'Show active or archived habits.', input: s.obj({ tab: s.enumOf(['active', 'archived']) }, ['tab']) },
  page_habit_open: { title: 'Open a habit', readOnly: true, description: 'Open a habit in its form.', input: s.obj({ habit_id: habitId }, ['habit_id']) },
  page_habit_new: { title: 'New habit form', readOnly: true, description: 'Open an empty habit form (nothing is saved until the form is submitted).' },
  page_habit_check_in: {
    title: 'Check in a habit',
    description:
      'Record a habit for a day (today by default): status done / skipped / failed / none (clears), or a `value` for numeric (the number) and timer / stopwatch (minutes) habits.',
    input: s.obj(
      {
        habit_id: habitId,
        date: s.date('The day; today when omitted'),
        status: s.enumOf(['done', 'skipped', 'failed', 'none']),
        value: s.num('numeric: the value; timer / stopwatch: minutes'),
        note: s.str('A note (habits with notes on)', { maxLength: 500 }),
      },
      ['habit_id'],
    ),
  },
  page_habit_archive: { title: 'Archive a habit', description: 'Archive an active habit (it leaves Today; history is kept).', input: s.obj({ habit_id: habitId }, ['habit_id']) },
  page_habit_restore: { title: 'Restore a habit', description: 'Bring an archived habit back to the active list.', input: s.obj({ habit_id: habitId }, ['habit_id']) },
});

type Tab = 'active' | 'archived';
type Deps = {
  tab: Tab;
  list: HabitView[] | undefined;
  setTab: (t: Tab) => void;
  openHabit: (id: string) => void;
  newHabit: () => void;
  checkIn: (dto: CheckInInput) => Promise<unknown>;
  archive: (id: string) => Promise<unknown>;
  restore: (id: string) => Promise<unknown>;
};

export function habitsScope(d: Deps): PageScope {
  const list = d.list ?? [];
  const find = (id: unknown) => list.find((h) => h.id === id);
  const missing = () => fail('No such habit in this list', 'habit_id', 'not-found:habit');

  return habitsTools.scope({
    title: 'Звички',
    params: { tab: d.tab },
    sections: d.list && {
      tab: d.tab,
      habits: list.map((h) => ({
        id: h.id,
        name: h.name,
        evaluation: h.evaluation,
        recurrence: h.recurrence.freq,
        target: h.targetValue,
        unit: h.unit,
        category: h.category?.name ?? null,
        status: h.status,
      })),
    },
    handlers: {
      page_habits_filter: (a) => {
        d.setTab(a.tab as Tab);
        return ok({ tab: a.tab });
      },
      page_habit_open: (a) => {
        const h = find(a.habit_id);
        if (!h) return missing();
        d.openHabit(h.id);
        return ok({ screen: 'habits.form', habit_id: h.id });
      },
      page_habit_new: () => {
        d.newHabit();
        return ok({ screen: 'habits.form' });
      },
      page_habit_check_in: async (a) => {
        const h = find(a.habit_id);
        if (!h) return missing();
        if (h.status !== 'active') return fail('An archived habit takes no check-ins', 'habit_id', 'invalid:habit-archived');
        const value = a.value as number | undefined;
        if (value === undefined && !a.status) return fail('Give a status or a value', 'status');
        if (value !== undefined && (h.evaluation === 'yes_no' || h.evaluation === 'checklist')) return fail(`A ${h.evaluation} habit takes a status, not a value`, 'value');
        const dto: CheckInInput = {
          habitId: h.id,
          date: (a.date as string | undefined) ?? today(),
          ...(a.status ? { status: a.status as CheckInInput['status'] } : {}),
          ...(value !== undefined ? { value: h.evaluation === 'numeric' ? value : Math.round(value * 60) } : {}),
          ...(a.note ? { note: a.note as string } : {}),
        };
        await d.checkIn(dto);
        return ok({ habit_id: h.id, date: dto.date });
      },
      page_habit_archive: d.tab === 'active' ? async (a) => {
        const h = find(a.habit_id);
        if (!h) return missing();
        await d.archive(h.id);
        return ok({ habit_id: h.id, status: 'archived' });
      } : undefined,
      page_habit_restore: d.tab === 'archived' ? async (a) => {
        const h = find(a.habit_id);
        if (!h) return missing();
        await d.restore(h.id);
        return ok({ habit_id: h.id, status: 'active' });
      } : undefined,
    },
  });
}
