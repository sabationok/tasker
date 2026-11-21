import type { UseFormReturn } from 'react-hook-form';
import { defineScreenTools, fail, fillFields, ok, readFields, s, setField, submitForm, formErrors, type AgentFields, type PageScope } from '@/lib/page-agent';
import { checklistAddSchema, checklistRemoveSchema, prioritySchema, recurrenceSchema } from '@/components/form-tool-schemas';
import { GOAL_WINDOWS, HABIT_EVALUATIONS, type Category, type GoalWindow, type HabitView } from '@/contracts/tasker';
import type { GoalDraft, HabitFormValues } from '../habit-form/habit-form.lib';

/*
 * `habits.form`: create / edit a habit. Fill and checklist tools only set form values; submit runs the form's own
 * `handleSubmit`; archive / restore / delete call the same mutations as the buttons below the form.
 */

/** The form keeps numbers as strings (inputs); the agent reads and writes numbers. */
const numField = (field: 'target' | 'checklistMin') => ({
  field,
  read: (v: HabitFormValues) => (v[field].trim() === '' ? null : Number(v[field].replace(',', '.'))),
  write: (x: unknown, form: UseFormReturn<HabitFormValues>) => setField(form, field, x === null ? '' : String(x)),
});

const FIELDS: AgentFields<HabitFormValues> = {
  name: { field: 'name' },
  description: { field: 'description' },
  category_id: { field: 'categoryId', read: (v) => v.categoryId ?? null },
  priority: { field: 'priority' },
  evaluation: { field: 'evaluation' },
  target: numField('target'),
  target_condition: { field: 'targetCondition' },
  unit: { field: 'unit' },
  checklist_min: numField('checklistMin'),
  recurrence: { field: 'recurrence' },
  starts_on: { field: 'startsOn' },
  ends_on: {
    field: 'endsOn',
    read: (v) => (v.hasEnd ? v.endsOn : null),
    write: (v, form) => {
      setField(form, 'hasEnd', v !== null);
      setField(form, 'endsOn', v ?? '');
    },
  },
  goals: {
    field: 'goals',
    read: (v) => Object.fromEntries(GOAL_WINDOWS.map((w) => [w, v.goals[w].enabled ? { value: Number(v.goals[w].value), metric: v.goals[w].metric } : null])),
    write: (x, form) => {
      const next = { ...form.getValues('goals') };
      for (const [w, g] of Object.entries(x as Record<GoalWindow, { value: number; metric: GoalDraft['metric'] } | null>))
        next[w as GoalWindow] = g ? { enabled: true, value: String(g.value), metric: g.metric } : { ...next[w as GoalWindow], enabled: false };
      setField(form, 'goals', next);
    },
  },
  notes_enabled: { field: 'notesEnabled' },
  reminders: { field: 'reminders' },
};

const goal = s.nullable(s.obj({ value: s.num('Target'), metric: s.enumOf(['days', 'sum'], 'Count days done, or sum the values') }, ['value', 'metric']));

export const habitFormTools = defineScreenTools('habits.form', {
  page_form_fill: {
    title: 'Fill the habit form',
    readOnly: true,
    description:
      'Set fields of the habit form (only the ones given). Nothing is saved until page_form_submit. ' +
      'target: the number for numeric habits, minutes for timer / stopwatch; target_condition and unit: numeric only; checklist_min: checklist only. ' +
      'goals: per window, { value, metric } or null to turn it off. reminders: "HH:mm" times (replaces the list).',
    input: s.obj(
      {
        values: s.obj({
          name: s.str('Name', { maxLength: 200 }),
          description: s.str('Description'),
          category_id: s.str('Category id, from sections.categories'),
          priority: prioritySchema,
          evaluation: s.enumOf(HABIT_EVALUATIONS, 'How a day is judged'),
          target: s.nullable(s.num('numeric: the number; timer / stopwatch: minutes')),
          target_condition: s.enumOf(['at_least', 'at_most', 'exactly']),
          unit: s.str('numeric: unit, e.g. km', { maxLength: 30 }),
          checklist_min: s.nullable(s.int('checklist: lines needed for done', { minimum: 1 })),
          recurrence: recurrenceSchema,
          starts_on: s.date('First day'),
          ends_on: s.nullable(s.date('Last day; null = no end')),
          goals: s.obj(Object.fromEntries(GOAL_WINDOWS.map((w) => [w, goal]))),
          notes_enabled: s.bool('Ask for a note on check-in'),
          reminders: s.arr(s.str('HH:mm', { format: 'time' }), 'Reminder times', 10),
        }),
      },
      ['values'],
    ),
  },
  page_checklist_add: { title: 'Add checklist lines', readOnly: true, description: 'Append lines to a checklist habit in the form (saved with the form).', input: checklistAddSchema },
  page_checklist_remove: { title: 'Remove a checklist line', readOnly: true, description: 'Remove one checklist line from the form (saved with the form).', input: checklistRemoveSchema },
  page_form_submit: { title: 'Save the habit', description: 'Save the form (the same as the save button), then go back.' },
  page_habit_archive: { title: 'Archive the habit', description: 'Archive this habit (it leaves Today; history is kept) and go back.' },
  page_habit_restore: { title: 'Restore the habit', description: 'Bring this archived habit back and go back.' },
  page_habit_delete: { title: 'Delete the habit', destructive: true, description: 'Delete this habit with its history and go back.' },
  page_form_close: { title: 'Close the form', readOnly: true, description: 'Go back without saving.' },
});

type Deps = {
  form: UseFormReturn<HabitFormValues>;
  habit: HabitView | undefined;
  categories: Category[];
  onValid: (v: HabitFormValues) => Promise<void>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  remove: () => Promise<void>;
  close: () => void;
};

export function habitFormScope({ form, habit, categories, onValid, archive, restore, remove, close }: Deps): PageScope {
  const done = (status: string) => ok({ habit_id: habit?.id ?? null, status });
  return habitFormTools.scope({
    title: habit ? 'Редагування звички' : 'Нова звичка',
    params: { habit_id: habit?.id ?? null },
    sections: {
      mode: habit ? 'edit' : 'create',
      habit_id: habit?.id ?? null,
      status: habit?.status ?? null,
      values: { ...readFields(form, FIELDS), checklist: form.getValues('checklist').map((c) => c.title) },
      changed: Object.keys(form.formState.dirtyFields),
      errors: formErrors(form, FIELDS),
      categories: categories.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name })),
    },
    handlers: {
      page_form_fill: (a) => {
        const v = a.values as Record<string, unknown>;
        if (typeof v.category_id === 'string' && !categories.some((c) => c.id === v.category_id)) return fail('No such category', 'values.category_id', 'not-found:category');
        return fillFields(form, FIELDS, v);
      },
      page_checklist_add: (a) => {
        const add = (a.titles as string[]).map((t) => t.trim()).filter(Boolean).map((title) => ({ title }));
        setField(form, 'checklist', [...form.getValues('checklist'), ...add]);
        return ok({ checklist: form.getValues('checklist').map((c) => c.title) });
      },
      page_checklist_remove: (a) => {
        const list = form.getValues('checklist');
        const at = a.position as number;
        if (at >= list.length) return fail('No checklist line at this position', 'position', 'not-found:line');
        setField(form, 'checklist', list.filter((_, i) => i !== at));
        return ok({ checklist: form.getValues('checklist').map((c) => c.title) });
      },
      page_form_submit: () => submitForm(form, FIELDS, onValid, () => ({ habit_id: habit?.id ?? null, status: 'saved' })),
      page_habit_archive: habit?.status === 'active' ? () => archive().then(() => done('archived')) : undefined,
      page_habit_restore: habit?.status === 'archived' ? () => restore().then(() => done('active')) : undefined,
      page_habit_delete: habit ? () => remove().then(() => done('deleted')) : undefined,
      page_form_close: () => {
        close();
        return ok();
      },
    },
  });
}
