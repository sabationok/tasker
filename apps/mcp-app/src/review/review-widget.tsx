import { useEffect, useState } from 'react';
import { tr } from '@/i18n';
import type { DraftResult } from '@/lib/host';
import { EmptyState, FlexBox, Text } from '@/ui';
import type { DraftFieldError, DraftView } from '@/contracts/tasker';
import { DraftReviewFlow } from '@/features/drafts/review/draft-review-flow';
import type { ToolResult, WidgetBridge } from '~/bridge/tools';
import { useMcpDraftSource } from './use-mcp-draft-source';

type Opened = { batchId: string | null; items: DraftView[] | null; errors: DraftFieldError[] };

/** What the host opened the widget with: a dry-run result (`batchId` + `draftId`) or a `review_drafts` result (`items`). */
function readOpened(r: ToolResult): Opened {
  const sc = r.structuredContent ?? {};
  return {
    batchId: typeof sc.batchId === 'string' ? sc.batchId : null,
    items: Array.isArray(sc.items) ? (sc.items as DraftView[]) : null,
    errors: sc.valid === false && Array.isArray(sc.errors) ? (sc.errors as DraftFieldError[]) : [],
  };
}

/** The decision as silent context for the model — the same training signal the server stores. */
function describe(d: DraftResult): string {
  if (d.status === 'discarded') return `The user dismissed tasker draft ${d.draftId}${d.reason ? ` (reason: ${d.reason})` : ''}.`;
  const changed = d.changes?.length ? ` after changing ${d.changes.map((c) => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join('; ')}` : ' as is';
  return `The user saved tasker draft ${d.draftId}${changed}.`;
}

/** tasker's MCP App: the same review as the mini app, inside a host iframe; decisions go back to the model as context. */
export function ReviewWidget({ bridge }: { bridge: WidgetBridge }) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => bridge.onToolResult((r) => setOpened(readOpened(r))), [bridge]);
  const source = useMcpDraftSource(bridge, opened?.batchId ?? null, opened?.items ?? null);

  if (!opened) return <EmptyState icon="drafts" title={tr('Waiting for the agent…')} />;
  if (!opened.batchId)
    return (
      <FlexBox gap="xs" className="p-page">
        <Text variant="label" tone="muted">
          {tr('The agent could not prepare this:')}
        </Text>
        {opened.errors.map((e, i) => (
          <Text key={i} variant="label" tone="danger">
            {e.path ? `${e.path}: ${e.message}` : e.message}
          </Text>
        ))}
      </FlexBox>
    );
  return (
    <div className="p-page">
      <DraftReviewFlow
        batchId={opened.batchId}
        source={source}
        onDecision={(d) => bridge.tellModel(describe(d), { tasker: { draft: d } })}
        editingId={editingId}
        onOpen={setEditingId}
        onClose={() => setEditingId(null)}
        title={tr('Check what the agent prepared')}
        pageButton
        agent={false}
      />
    </div>
  );
}
