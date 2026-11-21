import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';

/**
 * @ui TabBar
 * @spec Bottom navigation: route tabs plus action items (e.g. «create»), all the same shape; the active route uses the accent ink.
 * `compact`: icons only and a shorter bar (narrow windows); labels stay as aria-label / title.
 * @keywords tab bar, bottom navigation, nav, tabs
 */
export type TabBarItem = { type: 'route'; to: string; label: string; icon: IconName } | { type: 'action'; label: string; icon: IconName; onClick: () => void };

export function TabBar({ items, compact }: { items: TabBarItem[]; compact?: boolean }) {
  const cls = cn('flex flex-1 flex-col items-center gap-0.5 text-micro', compact ? 'py-2.5' : 'py-2');
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {items.map((t) =>
          t.type === 'route' ? (
            <NavLink key={t.to} to={t.to} aria-label={t.label} title={compact ? t.label : undefined} className={({ isActive }) => cn(cls, isActive ? 'text-fg font-medium' : 'text-muted')}>
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} size="md" />
                  {compact ? <span aria-hidden className={cn('h-0.5 w-4 rounded-pill', isActive ? 'bg-current' : 'bg-transparent')} /> : t.label}
                </>
              )}
            </NavLink>
          ) : (
            <button key={t.label} type="button" aria-label={t.label} title={compact ? t.label : undefined} onClick={t.onClick} className={cn(cls, 'text-muted')}>
              <Icon name={t.icon} size="md" />
              {!compact && t.label}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
