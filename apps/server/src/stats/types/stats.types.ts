export type StatsPeriod = 'week' | 'month' | 'year' | 'all';
export type StatsScope = 'habits' | 'tasks' | 'all';
export type Tally = { completed: number; skipped: number; failed: number };

export type StatsView = {
  period: { type: StatsPeriod; from: string; to: string };
  summary: { successRate: number | null } & Tally;
  habits: { id: string; name: string; score: number | null; goals: { window: string; value: number; target: number; metric: 'days' | 'sum' }[] }[];
  distribution: { completed: number; failed: number; skipped: number };
  byDay: ({ date: string } & Tally)[];
  overTime: { date: string; rate: number | null }[];
};
