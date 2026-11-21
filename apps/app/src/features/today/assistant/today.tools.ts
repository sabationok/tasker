import { defineScreenTools, fail, ok, s, type PageScope } from '@/lib/page-agent';
import { today } from '@/lib/dates';
import { USER_ASSIGNEE, type AgentView, type CheckInInput, type OccurrenceTarget, type TodayEntry, type TodayView } from '@/contracts/tasker';

/*
 * `today`: the day plan. Filters live in the URL (date, category); completing calls the same mutations as the row's
 * toggle; opening navigates like a tap on the row.
 */

const entryKey = s.str('The entry key, from sections.entries[].key');

export const todayTools = defineScreenTools('today', {
  page_day_select: { title: 'Pick a day', readOnly: true, description: 'Show another day (YYYY-MM-DD). Today when omitted.', input: s.obj({ date: s.date('The day; omit for today') }) },
  page_category_filter: {
    title: 'Filter by category',
    readOnly: true,
    description: 'Show only one category’s entries (id from sections.categories), or null for all.',
    input: s.obj({ category_id: s.nullable(s.str('Category id')) }, ['category_id']),
  },
  page_assignee_filter: {
    title: 'Filter by assignee',
    readOnly: true,
    description: 'Show only the user’s entries ("me": their tasks and all habits), one agent’s tasks (slug from sections.agents), or null for all.',
    input: s.obj({ assignee: s.nullable(s.str('"me", an agent slug, or null')) }, ['assignee']),
  },
  page_entry_open: { title: 'Open an entry', readOnly: true, description: 'Open the task or habit of an entry in its form.', input: s.obj({ entry_key: entryKey }, ['entry_key']) },
  page_entry_complete: {
    title: 'Complete an entry',
    description:
      'Mark an entry done for its day (the same as its toggle). Habits with a value (numeric, timer, stopwatch) need `value`: the number, or minutes for timer / stopwatch. Checklist habits are checked in by the user.',
    input: s.obj({ entry_key: entryKey, value: s.num('numeric: the value; timer / stopwatch: minutes') }, ['entry_key']),
  },
  page_entry_uncomplete: { title: 'Reopen an entry', description: 'Undo the done mark of an entry for its day.', input: s.obj({ entry_key: entryKey }, ['entry_key']) },
  page_entry_skip: {
    title: 'Skip an entry',
    description: 'Skip a periodic task’s or a habit’s occurrence for its day (not a one-off task).',
    input: s.obj({ entry_key: entryKey, note: s.str('Why', { maxLength: 500 }) }, ['entry_key']),
  },
});

type Deps = {
  date: string;
  category?: string;
  assignee?: string;
  agents: AgentView[];
  data: TodayView | undefined;
  /** The day's entries after the assignee filter (what the list shows). */
  entries: TodayEntry[];
  patch: (q: { date?: string; category?: string; assignee?: string }) => void;
  open: (e: TodayEntry) => void;
  complete: (t: OccurrenceTarget) => Promise<unknown>;
  uncomplete: (t: OccurrenceTarget) => Promise<unknown>;
  skip: (t: OccurrenceTarget & { note?: string }) => Promise<unknown>;
  checkIn: (dto: CheckInInput) => Promise<unknown>;
};

const target = (e: TodayEntry): OccurrenceTarget => ({ id: e.itemId!, ...(e.source === 'occurrence' ? { date: e.date, slot: e.slot } : {}) });
const habitTarget = (e: TodayEntry) => ({ habitId: e.habitId!, date: e.date, slot: e.slot });

export function todayScope(d: Deps): PageScope {
  const entries = d.entries;
  const find = (key: unknown) => entries.find((e) => e.key === key);
  const missing = () => fail('No such entry on this day', 'entry_key', 'not-found:entry');

  return todayTools.scope({
    title: 'Сьогодні',
    params: { date: d.date, category_id: d.category ?? null, assignee: d.assignee ?? null },
    sections: d.data && {
      date: d.date,
      is_today: d.date === today(),
      progress: d.data.progress,
      categories: d.data.categories.map((c) => ({ id: c.id, name: c.name, count: c.count })),
      assignee: d.assignee ?? null,
      agents: d.agents.map((a) => ({ slug: a.slug, name: a.name })),
      entries: entries.map((e) => ({
        key: e.key,
        kind: e.source,
        title: e.title,
        done: e.done,
        status: e.status ?? null,
        late: e.late ?? false,
        category: e.category?.name ?? null,
        priority: e.priority,
        ...(e.habit ? { habit: { evaluation: e.habit.evaluation, value: e.habit.value, target: e.habit.target, unit: e.habit.unit } } : {}),
        ...(e.checklist ? { checklist: e.checklist } : {}),
        ...(e.threads ? { threads: e.threads } : {}),
      })),
    },
    handlers: {
      page_day_select: (a) => {
        const date = (a.date as string | undefined) ?? today();
        d.patch({ date: date === today() ? undefined : date });
        return ok({ date });
      },
      page_category_filter: (a) => {
        const id = a.category_id as string | null;
        if (id && !d.data?.categories.some((c) => c.id === id)) return fail('No such category on this day', 'category_id', 'not-found:category');
        d.patch({ category: id ?? undefined });
        return ok({ category_id: id });
      },
      page_assignee_filter: (a) => {
        const v = a.assignee as string | null;
        if (v && v !== USER_ASSIGNEE && !d.agents.some((x) => x.slug === v)) return fail('No such agent', 'assignee', 'not-found:agent');
        d.patch({ assignee: v ?? undefined });
        return ok({ assignee: v });
      },
      page_entry_open: (a) => {
        const e = find(a.entry_key);
        if (!e) return missing();
        d.open(e);
        return ok({ screen: e.source === 'habit' ? 'habits.form' : 'tasks.form' });
      },
      page_entry_complete: async (a) => {
        const e = find(a.entry_key);
        if (!e) return missing();
        if (e.source !== 'habit') {
          await d.complete(target(e));
          return ok({ key: e.key, done: true });
        }
        const ev = e.habit?.evaluation ?? 'yes_no';
        if (ev === 'yes_no') await d.checkIn({ ...habitTarget(e), status: 'done' });
        else if (ev === 'checklist') return fail('Checklist habits are checked in by the user', 'entry_key', 'unsupported');
        else {
          if (typeof a.value !== 'number') return fail(`value is required for a ${ev} habit`, 'value');
          await d.checkIn({ ...habitTarget(e), value: ev === 'numeric' ? a.value : Math.round(a.value * 60) });
        }
        return ok({ key: e.key, done: true });
      },
      page_entry_uncomplete: async (a) => {
        const e = find(a.entry_key);
        if (!e) return missing();
        if (e.source === 'habit') await d.checkIn({ ...habitTarget(e), status: 'none' });
        else await d.uncomplete(target(e));
        return ok({ key: e.key, done: false });
      },
      page_entry_skip: async (a) => {
        const e = find(a.entry_key);
        if (!e) return missing();
        const note = a.note as string | undefined;
        if (e.source === 'task') return fail('A one-off task cannot be skipped; move or reopen it instead', 'entry_key', 'unsupported');
        if (e.source === 'habit') await d.checkIn({ ...habitTarget(e), status: 'skipped', ...(note ? { note } : {}) });
        else await d.skip({ ...target(e), ...(note ? { note } : {}) });
        return ok({ key: e.key, status: 'skipped' });
      },
    },
  });
}
