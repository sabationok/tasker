import type { HabitEvaluation, TargetCondition } from '@/contracts/tasker';

export const EVALUATION_LABEL: Record<HabitEvaluation, string> = {
  yes_no: 'Yes or no',
  numeric: 'Numeric value',
  checklist: 'Checklist',
  timer: 'Timer',
  stopwatch: 'Stopwatch',
};
export const EVALUATION_DESCRIPTION: Record<HabitEvaluation, string> = {
  yes_no: 'Track whether you did it or not.',
  numeric: 'A daily target or limit as a value.',
  checklist: 'Assess the day by a set of sub-items.',
  timer: 'Track a duration against a target.',
  stopwatch: 'Sessions summed over the day.',
};
export const CONDITION_LABEL: Record<TargetCondition, string> = { at_least: 'At least', at_most: 'At most', exactly: 'Exactly' };
export const GOAL_LABEL = { weekly: 'Weekly goal', monthly: 'Monthly goal', yearly: 'Yearly goal', allTime: 'All time goal' } as const;
