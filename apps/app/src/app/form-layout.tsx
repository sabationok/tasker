import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { host } from '@/lib/host';
import { PageAgentExtras } from '@/lib/page-agent';
import { useNavTool } from './assistant/nav.tools';
import { PageFrame } from '@/ui';
import { DevAgentPanel } from '@/components/dev-agent-panel';
import { RuntimeStrip } from '@/components/ai-context/runtime-strip';
import { useViewport } from '@/lib/viewport';
import { COMPACT_WIDTH } from './min-width-gate';

/** Full-screen forms and the drafts review: no tab bar. */
export function FormLayout() {
  useEffect(() => host.ready(), []);
  const nav = useNavTool();
  const compact = useViewport().width < COMPACT_WIDTH;
  return (
    <PageFrame>
      <RuntimeStrip compact={compact} />
      <PageAgentExtras.Provider value={[nav]}>
        <Outlet />
      </PageAgentExtras.Provider>
      {import.meta.env.DEV && <DevAgentPanel />}
    </PageFrame>
  );
}
