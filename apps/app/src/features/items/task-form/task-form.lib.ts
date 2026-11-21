import { isoToLocalInput, localInputToIso, today } from '@/lib/dates';
import type { PriorityValue } from '@/components/priority';
import { USER_ASSIGNEE, type ItemEvaluation, type ItemInput, type ItemView, type Recurrence } from '@/contracts/tasker';

export type TaskFormValues = {
  title: string;
  categoryId: string | undefined;
  priority: PriorityValue;
  date: string;
  pending: boolean;
  body: string;
  checklist: { id?: string; title: string }[];
  /** `datetime-local` for a single task, `HH:mm` for a periodic one. */
  reminders: string[];
  periodic: boolean;
  recurrence: Recurrence;
  startsOn: string;
  hasEnd: boolean;
  endsOn: string;
  evaluation: ItemEvaluation;
  /** `me` or an agent slug. */
  assignee: string;
};

export function toTaskFormData(item: ItemView | undefined, opts: { periodic: boolean; date?: string; categoryId?: string; assignee?: string }): TaskFormValues {
  const periodic = item ? !!item.recurrence : opts.periodic;
  return {
    title: item?.title ?? '',
    categoryId: item?.category?.id ?? opts.categoryId,
    priority: (item?.priority ?? 0) as PriorityValue,
    date: item ? (item.date ?? '') : (opts.date ?? today()),
    pending: item?.pending ?? false,
    body: item?.body ?? '',
    checklist: item?.checklist.map((c) => ({ id: c.id, title: c.title })) ?? [],
    reminders: (item?.reminders ?? []).map((r) => (r.at ? isoToLocalInput(r.at) : (r.timeOfDay?.slice(0, 5) ?? ''))).filter(Boolean),
    periodic,
    recurrence: item?.recurrence ?? { freq: 'daily' },
    startsOn: item?.startsOn ?? opts.date ?? today(),
    hasEnd: !!item?.endsOn,
    endsOn: item?.endsOn ?? '',
    evaluation: item?.evaluation ?? 'yes_no',
    assignee: item?.assignee ?? opts.assignee ?? USER_ASSIGNEE,
  };
}

export function toTaskReqData(v: TaskFormValues): ItemInput {
  const base: ItemInput = {
    type: 'task',
    title: v.title.trim(),
    body: v.body.trim() || null,
    priority: v.priority || null,
    categoryId: v.categoryId,
    assignee: v.assignee,
    checklist: v.checklist.filter((c) => c.title.trim()).map((c) => ({ ...(c.id ? { id: c.id } : {}), title: c.title.trim() })),
  };
  const reminders = v.reminders.filter(Boolean);
  if (v.periodic) {
    return {
      ...base,
      recurrence: v.recurrence,
      startsOn: v.startsOn || today(),
      endsOn: v.hasEnd && v.endsOn ? v.endsOn : null,
      evaluation: v.evaluation,
      date: null,
      pending: false,
      reminders: reminders.map((t) => ({ timeOfDay: t })),
    };
  }
  return { ...base, recurrence: null, date: v.date || null, pending: v.pending, reminders: reminders.map((t) => ({ at: localInputToIso(t) })) };
}
