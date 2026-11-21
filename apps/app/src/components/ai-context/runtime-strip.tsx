import { useState, useSyncExternalStore } from 'react';
import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { host } from '@/lib/host';
import { agentMonitor } from '@/lib/page-agent';
import { Icon, type IconName } from '@/ui';
import { AiContextSheet } from './ai-context-sheet';

/** Each runtime's mark: its icon and ink (theme tokens). */
const RUNTIME: Record<typeof host.type, { label: string; icon: IconName; ink: string }> = {
  mia: { label: 'Mia', icon: 'ai', ink: 'text-accent' },
  telegram: { label: 'Telegram', icon: 'runtime-telegram', ink: 'text-tag-sky-ink' },
  browser: { label: 'Browser', icon: 'runtime-browser', ink: 'text-muted' },
};
const DEV = { label: 'Dev agent', icon: 'ai' as IconName, ink: 'text-caution' };

/**
 * @ui RuntimeStrip
 * @spec One low-contrast line at the top of a screen while an AI agent is attached (the host's, or the dev stand-in):
 * the runtime and how many tools the live screen gives it; a tap opens «What the AI sees». Without an agent it renders
 * nothing. `compact` keeps only the runtime and the count.
 * @keywords runtime, host, ai, agent, banner, strip, page tools
 */
export function RuntimeStrip({ compact }: { compact?: boolean }) {
  const { context } = useSyncExternalStore(agentMonitor.subscribe, agentMonitor.get);
  const [open, setOpen] = useState(false);
  if (!host.agentKind) return null;
  const rt = host.agentKind === 'dev' ? DEV : RUNTIME[host.type];
  const n = context?.tools.length ?? 0;
  const parts = compact ? [tr(rt.label), String(n)] : [tr(rt.label), tr('AI connected'), tr('Actions on this screen: {n}', { n })];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${tr('What the AI sees')}: ${parts.join(', ')}`}
        className="-mx-page -mt-page mb-3 flex w-[calc(100%+2*var(--spacing-page))] items-center gap-1.5 border-b border-line px-page py-1 text-left text-caption text-muted"
      >
        <Icon name={rt.icon} size="sm" className={cn('shrink-0', rt.ink)} />
        <span className="min-w-0 truncate">{parts.join(' · ')}</span>
        <Icon name="next" size="sm" className="ml-auto shrink-0" />
      </button>
      {open && <AiContextSheet open onClose={() => setOpen(false)} />}
    </>
  );
}
