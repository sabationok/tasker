import { ChevronLeft, ChevronRight } from 'lucide-react';
import { intlLocale, tr } from '@/i18n';
import { addDays, addMonths, addYears, formatDay, today } from '@/lib/dates';
import { useAppQuery } from '@/lib/use-app-query';
import { EmptyState, FlexBox, FlexRow, IconButton, ProgressBar, QueryState, SectionCard, Segmented } from '@/ui';
import type { StatsPeriod, StatsScope } from '@/contracts/tasker';
import { useStats } from './stats.queries';
import { StatTiles } from './components/stat-tiles';
import { DistributionBar } from './components/distribution-bar';
import { ByDayChart } from './components/by-day-chart';
import { OverTimeChart } from './components/over-time-chart';

const SHIFT: Record<Exclude<StatsPeriod, 'all'>, (d: string, n: number) => string> = {
  week: (d, n) => addDays(d, n * 7),
  month: addMonths,
  year: addYears,
};

/** /stats for week / month / year / all, scope habits / tasks / all; period and anchor live in the URL. */
export function StatsScreen() {
  const { query, patch } = useAppQuery<{ period: StatsPeriod; anchor: string; scope: StatsScope }>();
  const period = query.period ?? 'week';
  const scope = query.scope ?? 'habits';
  const anchor = query.anchor ?? today();
  const stats = useStats({ period, anchor, scope });
  const s = stats.data;

  return (
    <FlexBox gap="md">
      <Segmented
        value={period}
        onChange={(p) => patch({ period: p, anchor: undefined })}
        options={[
          { value: 'week', label: tr('Week') },
          { value: 'month', label: tr('Month') },
          { value: 'year', label: tr('Year') },
          { value: 'all', label: tr('All time') },
        ]}
      />
      <Segmented
        value={scope}
        onChange={(v) => patch({ scope: v === 'habits' ? undefined : v })}
        options={[
          { value: 'habits', label: tr('Habits') },
          { value: 'tasks', label: tr('Tasks') },
          { value: 'all', label: tr('All') },
        ]}
      />
      {s && (
        <FlexRow justify="between">
          <IconButton label="‹" tone="bare" disabled={period === 'all'} icon={<ChevronLeft className="size-4" />} onClick={() => period !== 'all' && patch({ anchor: SHIFT[period](anchor, -1) })} />
          <span className="text-[15px] font-semibold">
            {formatDay(s.period.from, intlLocale)} – {formatDay(s.period.to, intlLocale)}
          </span>
          <IconButton label="›" tone="bare" disabled={period === 'all'} icon={<ChevronRight className="size-4" />} onClick={() => period !== 'all' && patch({ anchor: SHIFT[period](anchor, 1) })} />
        </FlexRow>
      )}
      <QueryState isLoading={stats.isLoading} error={stats.error} onRetry={() => stats.refetch()}>
        {s && (
          <>
            <SectionCard title={tr('Summary')}>
              <StatTiles summary={s.summary} />
            </SectionCard>
            {scope !== 'tasks' && (
              <SectionCard title={tr('Habit progress summary')}>
                {s.habits.length === 0 ? (
                  <EmptyState title={tr('No habits yet.')} />
                ) : (
                  s.habits.map((h) => (
                    <FlexBox key={h.id} gap="xs">
                      <FlexRow justify="between" className="text-sm">
                        <span className="font-medium">{h.name}</span>
                        <span className="tabular-nums text-muted">{h.score === null ? '—' : `${Math.round(h.score * 100)}%`}</span>
                      </FlexRow>
                      <ProgressBar percent={(h.score ?? 0) * 100} label={h.name} />
                      {h.goals.map((g) => (
                        <span key={g.window} className="text-xs text-muted">
                          {g.window}: {g.value} / {g.target} {tr(g.metric)}
                        </span>
                      ))}
                    </FlexBox>
                  ))
                )}
              </SectionCard>
            )}
            <SectionCard title={tr('Status distribution')}>
              <DistributionBar value={s.distribution} />
            </SectionCard>
            <SectionCard title={tr('Status by day')}>{s.byDay.length ? <ByDayChart days={s.byDay} /> : <EmptyState title={tr('No data for this period.')} />}</SectionCard>
            <SectionCard title={tr('Progress over time')}>{s.overTime.length ? <OverTimeChart points={s.overTime} /> : <EmptyState title={tr('No data for this period.')} />}</SectionCard>
          </>
        )}
      </QueryState>
    </FlexBox>
  );
}
