import { tr } from '@/i18n';
import { Badge, NavRow, Icon } from '@/ui';
import type { ItemView } from '@/contracts/tasker';

type Props = Pick<ItemView, 'connector' | 'connectorTools'>;

/**
 * @ui ConnectorBadge
 * @spec The hub connector an agent's to-do is about, as a list badge: its slug and how many of its tools it uses.
 * Nothing when the item has no connector.
 * @keywords connector, hub, agent, tools, fintrack
 */
export function ConnectorBadge({ connector, connectorTools }: Props) {
  if (!connector) return null;
  return <Badge icon="connector">{connectorTools?.length ? `${connector} · ${connectorTools.length}` : connector}</Badge>;
}

/**
 * @ui ConnectorRow
 * @spec Read-only form row: the connector's slug and the tools the hub matched (it sets them; the user doesn't edit
 * them). Nothing when the item has no connector.
 * @keywords connector, hub, agent, tools, read-only, form
 */
export function ConnectorRow({ connector, connectorTools }: Props) {
  if (!connector) return null;
  return (
    <NavRow
      icon={<Icon name="connector" size="sm" className="shrink-0 text-muted" />}
      label={`${tr('Connector')}: ${connector}`}
      value={connectorTools?.length ? connectorTools.join(', ') : tr('No tools matched')}
    />
  );
}
