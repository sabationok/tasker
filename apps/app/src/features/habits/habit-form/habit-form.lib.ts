import { today } from '@/lib/dates';
import type { PriorityValue } from '@/components/priority';
import { GOAL_WINDOWS, type GoalWindow, type HabitEvaluation, type HabitInput, type HabitView, type Recurrence, type TargetCondition } from '@/contracts/tasker';

export type GoalDraft = { enabled: boolean; value: string; metric: 'days' | 'sum' };
export type HabitFormValues = {
  name: string;
  description: string;
  categoryId: string | undefined;
  priority: PriorityValue;
  evaluation: HabitEvaluation;
  /** numeric: the number; timer / stopwatch: minutes (seconds on the wire). */
  target: string;
  targetCondition: TargetCondition;
  unit: string;
  checklist: { id?: string; title: string }[];
  checklistMin: string;
  recurrence: Recurrence;
  startsOn: string;
  hasEnd: boolean;
  endsOn: string;
  goals: Record<GoalWindow, GoalDraft>;
  notesEnabled: boolean;
  reminders: string[];
};

export const isTimeEvaluation = (e: HabitEvaluation) => e === 'timer' || e === 'stopwatch';

export function toHabitFormData(h: HabitView | undefined, categoryId?: string): HabitFormValues {
  const ev = h?.evaluation ?? 'yes_no';
  const target = h?.targetValue ?? null;
  return {
    name: h?.name ?? '',
    description: h?.description ?? '',
    categoryId: h?.category?.id ?? categoryId,
    priority: (h?.priority ?? 0) as PriorityValue,
    evaluation: ev,
    target: target === null ? '' : String(isTimeEvaluation(ev) ? Math.round(target / 60) : target),
    targetCondition: h?.targetCondition ?? 'at_least',
    unit: h?.unit ?? '',
    checklist: h?.checklist.map((c) => ({ id: c.id, title: c.title })) ?? [],
    checklistMin: h?.checklistMin ? String(h.checklistMin) : '',
    recurrence: h?.recurrence ?? { freq: 'daily' },
    startsOn: h?.startsOn ?? today(),
    hasEnd: !!h?.endsOn,
    endsOn: h?.endsOn ?? '',
    goals: Object.fromEntries(
      GOAL_WINDOWS.map((w) => {
        const g = h?.goals[w];
        return [w, { enabled: !!g, value: g ? String(g.value) : '', metric: g?.metric ?? 'days' }];
      }),
    ) as Record<GoalWindow, GoalDraft>,
    notesEnabled: h?.notesEnabled ?? false,
    reminders: (h?.reminders ?? []).map((r) => r.timeOfDay?.slice(0, 5) ?? '').filter(Boolean),
  };
}

const num = (s: string): number | null => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && !Number.isNaN(n) ? n : null;
};

export function toHabitReqData(v: HabitFormValues): HabitInput {
  const ev = v.evaluation;
  const t = num(v.target);
  const goals = Object.fromEntries(
    GOAL_WINDOWS.filter((w) => v.goals[w].enabled && num(v.goals[w].value)).map((w) => [w, { value: num(v.goals[w].value)!, metric: v.goals[w].metric }]),
  );
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    categoryId: v.categoryId,
    priority: v.priority || null,
    evaluation: ev,
    targetValue: ev === 'yes_no' || ev === 'checklist' || t === null ? null : isTimeEvaluation(ev) ? Math.round(t * 60) : t,
    targetCondition: ev === 'numeric' ? v.targetCondition : null,
    unit: ev === 'numeric' ? v.unit.trim() || null : null,
    checklist: ev === 'checklist' ? v.checklist.filter((c) => c.title.trim()).map((c) => ({ ...(c.id ? { id: c.id } : {}), title: c.title.trim() })) : [],
    checklistMin: ev === 'checklist' ? num(v.checklistMin) : null,
    recurrence: v.recurrence,
    startsOn: v.startsOn || today(),
    endsOn: v.hasEnd && v.endsOn ? v.endsOn : null,
    goals,
    notesEnabled: v.notesEnabled,
    reminders: v.reminders.filter(Boolean).map((timeOfDay) => ({ timeOfDay })),
  };
}
