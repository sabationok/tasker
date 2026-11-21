import type { UseFormReturn } from 'react-hook-form';
import { defineScreenTools, fail, fillFields, ok, readFields, s, setField, submitForm, formErrors, type AgentFields, type PageScope } from '@/lib/page-agent';
import { checklistAddSchema, checklistRemoveSchema, prioritySchema, recurrenceSchema } from '@/components/form-tool-schemas';
import { USER_ASSIGNEE, type AgentView, type Category, type ItemView, type SubtasksOrder } from '@/contracts/tasker';
import type { TaskFormValues } from '../task-form/task-form.lib';

/*
 * `tasks.form`: create / edit a task. Fill and checklist tools only set form values (react-hook-form `setValue`);
 * submit runs the form's own `handleSubmit` (the save button's path); split and delete call the same mutations as
 * the threads section and the delete button.
 */

const FIELDS: AgentFields<TaskFormValues> = {
  title: { field: 'title' },
  body: { field: 'body' },
  category_id: { field: 'categoryId', read: (v) => v.categoryId ?? null },
  assignee: { field: 'assignee' },
  priority: { field: 'priority' },
  date: { field: 'date', read: (v) => (v.periodic ? null : v.date || null) },
  pending: { field: 'pending' },
  periodic: { field: 'periodic' },
  recurrence: { field: 'recurrence', read: (v) => (v.periodic ? v.recurrence : null) },
  starts_on: { field: 'startsOn', read: (v) => (v.periodic ? v.startsOn : null) },
  ends_on: {
    field: 'endsOn',
    read: (v) => (v.periodic && v.hasEnd ? v.endsOn : null),
    write: (v, form) => {
      setField(form, 'hasEnd', v !== null);
      setField(form, 'endsOn', v ?? '');
    },
  },
  evaluation: { field: 'evaluation' },
  reminders: { field: 'reminders' },
};

export const taskFormTools = defineScreenTools('tasks.form', {
  page_form_fill: {
    title: 'Fill the task form',
    readOnly: true,
    description:
      'Set fields of the task form (only the ones given). Nothing is saved until page_form_submit. ' +
      'Single tasks use date / pending; periodic tasks (periodic: true) use recurrence, starts_on, ends_on, evaluation. ' +
      'reminders: "YYYY-MM-DDTHH:mm" local times for a single task, "HH:mm" for a periodic one.',
    input: s.obj(
      {
        values: s.obj({
          title: s.str('Name', { maxLength: 300 }),
          body: s.str('Description'),
          category_id: s.str('Category id, from sections.categories'),
          assignee: s.str('Whose to-do: "me" (default) or an agent slug from sections.agents'),
          priority: prioritySchema,
          date: s.nullable(s.date('Single task: its day; null = no date')),
          pending: s.bool('Single task: waiting on someone else'),
          periodic: s.bool('Periodic task'),
          recurrence: recurrenceSchema,
          starts_on: s.date('Periodic: first day'),
          ends_on: s.nullable(s.date('Periodic: last day; null = no end')),
          evaluation: s.enumOf(['yes_no', 'checklist'], 'Periodic: done as one tick, or by its checklist'),
          reminders: s.arr(s.str(), 'Reminder times (replaces the list)', 10),
        }),
      },
      ['values'],
    ),
  },
  page_checklist_add: { title: 'Add checklist lines', readOnly: true, description: 'Append lines to the task’s checklist in the form (saved with the form).', input: checklistAddSchema },
  page_checklist_remove: { title: 'Remove a checklist line', readOnly: true, description: 'Remove one checklist line from the form (saved with the form).', input: checklistRemoveSchema },
  page_form_submit: { title: 'Save the task', description: 'Save the form (the same as the save button), then go back.' },
  page_subtasks_split: {
    title: 'Split into threads',
    description: 'Split this saved task into sub-tasks (threads), saved at once; `order`: any or sequential.',
    input: s.obj({ titles: s.arr(s.str(undefined, { maxLength: 300 }), 'Thread titles', 20), order: s.enumOf(['any', 'sequential']) }, ['titles']),
  },
  page_task_delete: { title: 'Delete the task', destructive: true, description: 'Delete this task and go back.' },
  page_form_close: { title: 'Close the form', readOnly: true, description: 'Go back without saving.' },
});

type Deps = {
  form: UseFormReturn<TaskFormValues>;
  item: ItemView | undefined;
  categories: Category[];
  agents: AgentView[];
  onValid: (v: TaskFormValues) => Promise<void>;
  split: (dto: { id: string; order: SubtasksOrder; threads: { title: string }[] }) => Promise<unknown>;
  remove: () => Promise<void>;
  close: () => void;
};

export function taskFormScope({ form, item, categories, agents, onValid, split, remove, close }: Deps): PageScope {
  const values = form.getValues();
  const canSplit = !!item && !values.periodic && !item.parentId;
  return taskFormTools.scope({
    title: item ? 'Редагування задачі' : 'Нова задача',
    params: { task_id: item?.id ?? null },
    sections: {
      mode: item ? 'edit' : 'create',
      task_id: item?.id ?? null,
      values: { ...readFields(form, FIELDS), checklist: values.checklist.map((c) => c.title) },
      changed: Object.keys(form.formState.dirtyFields),
      errors: formErrors(form, FIELDS),
      categories: categories.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name })),
      agents: agents.map((x) => ({ slug: x.slug, name: x.name })),
      ...(item?.threads ? { threads: item.threads } : {}),
    },
    handlers: {
      page_form_fill: (a) => {
        const v = a.values as Record<string, unknown>;
        if (typeof v.category_id === 'string' && !categories.some((c) => c.id === v.category_id)) return fail('No such category', 'values.category_id', 'not-found:category');
        if (typeof v.assignee === 'string' && v.assignee !== USER_ASSIGNEE && !agents.some((x) => x.slug === v.assignee)) return fail('No such agent', 'values.assignee', 'not-found:agent');
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
      page_form_submit: () => submitForm(form, FIELDS, onValid, () => ({ task_id: item?.id ?? null, status: 'saved' })),
      page_subtasks_split: canSplit
        ? async (a) => {
            const titles = (a.titles as string[]).map((t) => t.trim()).filter(Boolean);
            if (!titles.length) return fail('Give at least one title', 'titles');
            await split({ id: item!.id, order: (a.order as SubtasksOrder | undefined) ?? item!.subtasksOrder, threads: titles.map((title) => ({ title })) });
            return ok({ task_id: item!.id, threads: titles });
          }
        : undefined,
      page_task_delete: item
        ? async () => {
            await remove();
            return ok({ task_id: item.id, status: 'deleted' });
          }
        : undefined,
      page_form_close: () => {
        close();
        return ok();
      },
    },
  });
}
