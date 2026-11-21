import { defineScreenTools, fail, ok, s, type PageScope } from '@/lib/page-agent';
import type { StatsPeriod, StatsScope, StatsView } from '@/contracts/tasker';

/* `stats`: period / scope / anchor live in the URL, the same as the segmented controls and the arrows. */

export const statsTools = defineScreenTools('stats', {
  page_stats_filter: {
    title: 'Set the period',
    readOnly: true,
    description: 'Show statistics for a period (week, month, year, all time), a scope (habits, tasks, all), and a day inside the period (`anchor`; the current period when omitted).',
    input: s.obj({ period: s.enumOf(['week', 'month', 'year', 'all']), scope: s.enumOf(['habits', 'tasks', 'all']), anchor: s.date('A day inside the period') }),
  },
  page_stats_shift: {
    title: 'Previous / next period',
    readOnly: true,
    description: 'Move to the previous or next period (not for all time).',
    input: s.obj({ direction: s.enumOf(['prev', 'next']) }, ['direction']),
  },
});

type Deps = {
  period: StatsPeriod;
  scope: StatsScope;
  anchor: string;
  data: StatsView | undefined;
  patch: (q: { period?: StatsPeriod; scope?: StatsScope; anchor?: string }) => void;
  shift: (n: -1 | 1) => void;
};

export function statsScope(d: Deps): PageScope {
  const pct = (x: number | null) => (x === null ? null : Math.round(x * 100));
  return statsTools.scope({
    title: 'Статистика',
    params: { period: d.period, scope: d.scope, anchor: d.anchor },
    sections: d.data && {
      period: d.data.period,
      scope: d.scope,
      summary: { success_rate_percent: pct(d.data.summary.successRate), completed: d.data.summary.completed, skipped: d.data.summary.skipped, failed: d.data.summary.failed },
      habits: d.data.habits.map((h) => ({ id: h.id, name: h.name, score_percent: pct(h.score), goals: h.goals })),
      by_day: d.data.byDay,
    },
    handlers: {
      page_stats_filter: (a) => {
        const period = (a.period as StatsPeriod | undefined) ?? d.period;
        d.patch({
          ...(a.period ? { period } : {}),
          ...(a.scope ? { scope: a.scope === 'habits' ? undefined : (a.scope as StatsScope) } : {}),
          anchor: (a.anchor as string | undefined) ?? (a.period ? undefined : d.anchor),
        });
        return ok({ period, scope: (a.scope as StatsScope | undefined) ?? d.scope });
      },
      page_stats_shift: (a) => {
        if (d.period === 'all') return fail('All time has no previous or next period', 'direction', 'unsupported');
        d.shift(a.direction === 'prev' ? -1 : 1);
        return ok({ direction: a.direction });
      },
    },
  });
}
