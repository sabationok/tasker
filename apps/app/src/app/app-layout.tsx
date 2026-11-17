import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, CalendarCheck, CheckSquare, ListTodo, Plus } from 'lucide-react';
import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { host } from '@/lib/host';
import { routes } from '@/lib/routes';
import { QuickActionsSheet } from './quick-actions-sheet';

const TABS = [
  { to: routes.today(), label: 'Today', icon: CalendarCheck },
  { to: routes.habits(), label: 'Habits', icon: ListTodo },
  null,
  { to: routes.tasks(), label: 'Tasks', icon: CheckSquare },
  { to: routes.stats(), label: 'Statistics', icon: BarChart3 },
] as const;

/** The shell: one scroll column + bottom tab bar with the «+» in the middle. Mounted once for all tab pages. */
export function AppLayout() {
  const [quick, setQuick] = useState(false);
  useEffect(() => host.ready(), []);
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 items-center rounded-2xl border border-line bg-surface/95 px-1 py-1.5 shadow-lg backdrop-blur">
          {TABS.map((t) =>
            t ? (
              <NavLink key={t.to} to={t.to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-1 text-[11px]', isActive ? 'text-accent' : 'text-muted')}>
                <t.icon className="size-5" />
                {tr(t.label)}
              </NavLink>
            ) : (
              <div key="plus" className="flex justify-center">
                <button type="button" aria-label={tr('Quick actions')} onClick={() => setQuick(true)} className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-md">
                  <Plus className="size-6" />
                </button>
              </div>
            ),
          )}
        </div>
      </nav>
      <QuickActionsSheet open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}
