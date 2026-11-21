import type { CategoryRef } from '../../items/types/item-view.types';

export type TodayEntry = {
  source: 'task' | 'occurrence' | 'habit';
  /** Stable key: item / habit id, plus `:date:slot` for occurrences and habits. */
  key: string;
  itemId?: string;
  habitId?: string;
  shortId?: number;
  date: string;
  /** A moved occurrence: the day it was scheduled on — complete / skip it with this date. */
  occurrenceDate?: string;
  slot?: number;
  title: string;
  type: 'task' | 'habit';
  category: CategoryRef | null;
  /** Whose to-do: `me` or an agent's slug (habits are always the user's). */
  assignee: string;
  priority: number | null;
  checklist?: { done: number; total: number };
  threads?: { done: number; total: number };
  habit?: { evaluation: string; value: number | null; target: number | null; unit: string | null };
  done: boolean;
  status?: 'done' | 'skipped' | 'failed';
  late?: boolean;
};

/** Filters of a day view; the category chip counts follow `assignee`. */
export type TodayFilter = { categoryId?: string; assignee?: string };

export type TodayView = {
  date: string;
  progress: { done: number; total: number; percent: number };
  categories: (CategoryRef & { count: number })[];
  completed: number;
  entries: TodayEntry[];
};
