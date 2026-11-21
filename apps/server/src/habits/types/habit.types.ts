export const HABIT_EVALUATIONS = ['yes_no', 'numeric', 'checklist', 'timer', 'stopwatch'] as const;
export const TARGET_CONDITIONS = ['at_least', 'at_most', 'exactly'] as const;
export const HABIT_STATUSES = ['active', 'archived'] as const;
export const GOAL_WINDOWS = ['weekly', 'monthly', 'yearly', 'allTime'] as const;

export type HabitEvaluation = (typeof HABIT_EVALUATIONS)[number];
export type TargetCondition = (typeof TARGET_CONDITIONS)[number];
export type HabitStatus = (typeof HABIT_STATUSES)[number];
export type GoalWindow = (typeof GOAL_WINDOWS)[number];
export type HabitGoal = { value: number; metric: 'days' | 'sum' };
export type HabitGoals = Partial<Record<GoalWindow, HabitGoal>>;
export type CheckinStatus = 'done' | 'skipped' | 'failed';
