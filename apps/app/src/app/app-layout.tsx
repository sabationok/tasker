import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { tr } from '@/i18n';
import { host } from '@/lib/host';
import { PageAgentExtras } from '@/lib/page-agent';
import { useNavTool } from './assistant/nav.tools';
import { routes } from '@/lib/routes';
import { PageFrame, TabBar } from '@/ui';
import { DevAgentPanel } from '@/components/dev-agent-panel';
import { RuntimeStrip } from '@/components/ai-context/runtime-strip';
import { QuickActionsSheet } from './quick-actions-sheet';
import { useViewport } from '@/lib/viewport';
import { COMPACT_WIDTH } from './min-width-gate';

/** The shell: one page column + the bottom tab bar (routes + «create»). Mounted once for all tab pages. */
export function AppLayout() {
  const [quick, setQuick] = useState(false);
  const nav = useNavTool();
  const compact = useViewport().width < COMPACT_WIDTH;
  useEffect(() => host.ready(), []);
  return (
    <>
      <PageFrame withTabBar>
        <RuntimeStrip compact={compact} />
        <PageAgentExtras.Provider value={[nav]}>
          <Outlet />
        </PageAgentExtras.Provider>
      </PageFrame>
      <TabBar
        compact={compact}
        items={[
          { type: 'route', to: routes.today(), label: tr('Today'), icon: 'today' },
          { type: 'route', to: routes.habits(), label: tr('Habits'), icon: 'habits' },
          { type: 'action', label: tr('Create'), icon: 'add', onClick: () => setQuick(true) },
          { type: 'route', to: routes.tasks(), label: tr('Tasks'), icon: 'tasks' },
          { type: 'route', to: routes.stats(), label: tr('Statistics'), icon: 'stats' },
        ]}
      />
      <QuickActionsSheet open={quick} onClose={() => setQuick(false)} />
      {import.meta.env.DEV && <DevAgentPanel />}
    </>
  );
}
