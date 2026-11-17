import type { HabitEntity } from '../entities/habit.entity';

/** Whether a day's result meets the habit's target: 'done', or null (partial / nothing). */
export function checkinStatus(habit: Pick<HabitEntity, 'evaluation' | 'targetValue' | 'targetCondition' | 'checklistMin'>, result: { value: number | null; checklistDone: string[] }, checklistTotal: number): 'done' | null {
  const v = result.value ?? 0;
  const t = habit.targetValue;
  switch (habit.evaluation) {
    case 'yes_no':
      return 'done';
    case 'numeric':
      if (t === null) return v > 0 ? 'done' : null;
      if (habit.targetCondition === 'at_most') return result.value !== null && v <= t ? 'done' : null;
      if (habit.targetCondition === 'exactly') return v === t ? 'done' : null;
      return v >= t ? 'done' : null;
    case 'checklist': {
      const need = habit.checklistMin ?? checklistTotal;
      return need > 0 && result.checklistDone.length >= need ? 'done' : null;
    }
    case 'timer':
    case 'stopwatch':
      return t !== null ? (v >= t ? 'done' : null) : v > 0 ? 'done' : null;
  }
}
