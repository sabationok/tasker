import type { CategoryRef } from '../../items/types/item-view.types';
import type { ReminderView } from '../../reminders/reminders.service';
import type { Recurrence } from '../../recurrence/recurrence.schema';
import type { HabitEvaluation, HabitGoals, HabitStatus, TargetCondition } from './habit.types';

export type HabitView = {
  id: string;
  shortId: number;
  name: string;
  description: string | null;
  priority: number | null;
  evaluation: HabitEvaluation;
  targetValue: number | null;
  targetCondition: TargetCondition | null;
  unit: string | null;
  checklistMin: number | null;
  recurrence: Recurrence;
  startsOn: string;
  endsOn: string | null;
  goals: HabitGoals;
  notesEnabled: boolean;
  status: HabitStatus;
  archivedAt: string | null;
  category: CategoryRef | null;
  checklist: { id: string; title: string; position: number }[];
  reminders: ReminderView[];
};

export type CheckinView = { id: string; date: string; slot: number; status: 'done' | 'skipped' | 'failed' | null; value: number | null; checklistDone: string[]; note: string | null };
