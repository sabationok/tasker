import { useState, useSyncExternalStore } from 'react';
import { STAGE } from '@/config/stage';
import { tr } from '@/i18n';
import { host } from '@/lib/host';
import { agentMonitor, SCREEN_TOOLS, type MonitoredEvent, type PageAgentEvent, type PageToolSpec } from '@/lib/page-agent';
import { Badge, Divider, Field, FlexBox, FlexLi, FlexRow, FlexUl, KeyValueList, SectionCard, Select, Sheet, Text } from '@/ui';
import { argLines, type ArgLine } from './schema-text';

const HOST_LABEL = { mia: 'Mia', telegram: 'Telegram', browser: 'Browser' } as const;
/** Screen ids → the label source text (titles of screens that are not open). */
const SCREEN_LABEL: Record<string, string> = {
  today: 'Today',
  tasks: 'Tasks',
  'tasks.form': 'Task form',
  habits: 'Habits',
  'habits.form': 'Habit form',
  stats: 'Statistics',
  drafts: 'Drafts',
  'drafts.batch': 'Draft batch',
  'drafts.edit': 'Draft form',
};
const screenLabel = (id: string) => (SCREEN_LABEL[id] ? tr(SCREEN_LABEL[id]) : id);

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** A lifecycle event in words. */
function eventText(e: PageAgentEvent): string {
  switch (e.type) {
    case 'busy':
      return e.busy ? tr('Saving started') : tr('Saving finished');
    case 'visibility':
      return e.visible ? tr('Page shown') : tr('Page hidden');
    case 'resize':
      return `${tr('Size')} ${e.width} × ${e.height}${e.compact ? ` · ${tr('too small')}` : ''}`;
    case 'closing':
      return tr('Page closing');
    case 'closeVerdict':
      return e.verdict === 'dirty' ? tr('Asked to close: unsaved changes') : e.verdict === 'keep' ? tr('Asked to close: kept open') : tr('Asked to close: may close');
  }
}

/**
 * @ui AiContextSheet
 * @spec Read-only view of what the host's AI gets from the page: host state and lifecycle events, the live screen's
 * context as last sent (tools, whether each saves, their arguments), and any other screen's declared tools.
 * @keywords ai, agent, page tools, context, what the ai sees
 */
export function AiContextSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { context, events } = useSyncExternalStore(agentMonitor.subscribe, agentMonitor.get);
  const [picked, setPicked] = useState<string | null>(null);
  const live = context?.screen ?? null;
  const screen = picked ?? live ?? [...SCREEN_TOOLS.keys()][0];
  const isLive = screen === live;
  const tools: PageToolSpec[] = isLive ? (context?.tools ?? []) : (SCREEN_TOOLS.get(screen) ?? []);
  const options = [...new Set([...(live ? [live] : []), ...SCREEN_TOOLS.keys()])].map((id) => ({
    value: id,
    label: id === live ? `${screenLabel(id)} · ${tr('this screen')}` : screenLabel(id),
  }));

  return (
    <Sheet open={open} onClose={onClose} title={tr('What the AI sees')}>
      <FlexBox gap="md">
        <SectionCard title={tr('Host')}>
          <KeyValueList
            items={[
              [tr('Opened in'), tr(HOST_LABEL[host.type])],
              [tr('Stage'), STAGE],
              [tr('Agent'), host.agent.attached ? tr('Connected') : tr('Not connected: calls do nothing')],
              [tr('Screen now'), live ? `${screenLabel(live)} (${live})` : '—'],
            ]}
          />
          <EventList events={events} />
        </SectionCard>

        <Field label={tr('Screen')} htmlFor="ai-screen">
          <Select id="ai-screen" value={screen} onChange={(e) => setPicked(e.target.value)} options={options} />
        </Field>

        <SectionCard title={isLive && context?.title ? context.title : screenLabel(screen)}>
          <FlexRow wrap>
            <Text variant="caption" tone="muted">
              {screen}
            </Text>
            {isLive ? <Badge tone="positive">{tr('On this screen')}</Badge> : <Badge>{tr('Not on this screen')}</Badge>}
            <Badge>{tr('{n} tools', { n: tools.length })}</Badge>
          </FlexRow>
          {!isLive && (
            <Text variant="caption" tone="muted">
              {tr('Declared tools; the AI gets them only while this screen is open (plus opening other screens).')}
            </Text>
          )}
          {tools.length === 0 ? (
            <Text variant="label" tone="muted">
              {tr('No tools here.')}
            </Text>
          ) : (
            <FlexUl gap="md">
              {tools.map((t, i) => (
                <li key={t.name}>
                  {i > 0 && <Divider />}
                  <ToolItem tool={t} />
                </li>
              ))}
            </FlexUl>
          )}
        </SectionCard>
      </FlexBox>
    </Sheet>
  );
}

function EventList({ events }: { events: MonitoredEvent[] }) {
  return (
    <FlexBox gap="xs">
      <Text variant="overline" tone="muted">
        {tr('Latest events')}
      </Text>
      {events.length === 0 ? (
        <Text variant="caption" tone="muted">
          {tr('None yet.')}
        </Text>
      ) : (
        <FlexUl gap="none">
          {events.map((e) => (
            <FlexLi key={`${e.at}-${e.event.type}`}>
              <Text variant="caption" tone="muted" numeric>
                {time(e.at)}
              </Text>
              <Text variant="caption">{eventText(e.event)}</Text>
            </FlexLi>
          ))}
        </FlexUl>
      )}
    </FlexBox>
  );
}

/** One tool: title, whether it saves, what it does, and its arguments. */
function ToolItem({ tool }: { tool: PageToolSpec }) {
  const saves = !tool.annotations.readOnlyHint;
  return (
    <FlexBox gap="xs" className="pt-2">
      <FlexRow wrap>
        <Text variant="strong">{tool.annotations.title ?? tool.name}</Text>
        {saves ? <Badge tone="caution">{tr('Needs confirmation')}</Badge> : <Badge>{tr('Does not save')}</Badge>}
        {tool.annotations.destructiveHint && <Badge tone="negative">{tr('Deletes')}</Badge>}
      </FlexRow>
      <Text variant="caption" tone="muted">
        {tool.name}
      </Text>
      <Text variant="label">{tool.description}</Text>
      <ArgList lines={argLines(tool.inputSchema)} />
    </FlexBox>
  );
}

function ArgList({ lines, nested }: { lines: ArgLine[]; nested?: boolean }) {
  if (!lines.length)
    return nested ? null : (
      <Text variant="caption" tone="muted">
        {tr('No arguments.')}
      </Text>
    );
  return (
    <FlexUl gap="xs" className={nested ? 'border-l border-line pl-3' : undefined}>
      {lines.map((a) => (
        <li key={a.name}>
          <FlexBox gap="none">
            <FlexRow wrap gap="xs">
              <Text variant="label">{a.name}</Text>
              <Text variant="caption" tone="muted">
                {a.type}
              </Text>
              {a.required && <Badge tone="accent">{tr('required')}</Badge>}
            </FlexRow>
            {a.hint && (
              <Text variant="caption" tone="muted">
                {a.hint}
              </Text>
            )}
            {a.children && <ArgList lines={a.children} nested />}
          </FlexBox>
        </li>
      ))}
    </FlexUl>
  );
}
