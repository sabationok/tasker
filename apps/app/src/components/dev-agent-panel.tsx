import { useState, useSyncExternalStore } from 'react';
import { devAgentHost } from '@/lib/host';
import type { PageToolOutcome } from '@/lib/page-agent';

const subscribe = (cb: () => void) => {
  devAgentHost.listeners.add(cb);
  return () => devAgentHost.listeners.delete(cb);
};

/**
 * DEV ONLY — a stand-in for Mia's agent while Mia's host side is not built: shows the context the page provides and
 * calls its tools by name with JSON args (green: read-only, orange: persists). Same path as `window.__taskerAgent.call(name, args)` in the console.
 * Deliberately unstyled (not part of the product UI).
 */
export function DevAgentPanel() {
  const ctx = useSyncExternalStore(subscribe, () => devAgentHost.context);
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState('{}');
  const [last, setLast] = useState<{ name: string; out: PageToolOutcome } | null>(null);
  if (!import.meta.env.DEV) return null;
  return (
    <div style={{ position: 'fixed', right: 8, bottom: 72, zIndex: 50, maxWidth: 360, font: '12px ui-monospace, monospace', background: '#111', color: '#eee', borderRadius: 8, padding: 8, opacity: 0.92 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ color: '#9cf' }}>
        agent: {ctx ? `${ctx.screen} · ${ctx.tools.length} tools` : 'no context'} {open ? '▾' : '▸'}
      </button>
      {open && ctx && (
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          <textarea value={args} onChange={(e) => setArgs(e.target.value)} rows={3} style={{ background: '#222', color: '#eee', width: '100%' }} aria-label="args JSON" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ctx.tools.map(({ name, annotations }) => (
              <button
                key={name}
                type="button"
                title={annotations.readOnlyHint ? 'read-only' : 'persists (confirm card)'}
                style={{ border: '1px solid #555', borderRadius: 4, padding: '2px 6px', color: annotations.readOnlyHint ? '#cfc' : '#fc9' }}
                onClick={async () => {
                  let a: Record<string, unknown> = {};
                  try {
                    a = JSON.parse(args || '{}');
                  } catch {
                    return setLast({ name, out: { ok: false, errors: [{ path: '', code: 'json', message: 'args is not JSON' }] } });
                  }
                  setLast({ name, out: await devAgentHost.call(name, a) });
                }}
              >
                {name}
              </button>
            ))}
          </div>
          {last && <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{`${last.name} → ${JSON.stringify(last.out, null, 1)}`}</pre>}
          <details>
            <summary>sections</summary>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(ctx.sections, null, 1)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
