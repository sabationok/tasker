import type { ReminderAssignment } from '../../../../../events/types/connector-event.types';
import type { ItemEntity } from '../../../../../items/entities/item.entity';

/** `reminder.due`'s `assignment` for an agent's to-do: what to do and in which connector; none for the user's own. */
export function reminderAssignmentOf(item: ItemEntity | undefined): { assignment?: ReminderAssignment } {
  if (!item || item.assignee === 'me') return {};
  return { assignment: { agent: item.assignee, connector: item.connector, connectorTools: item.connectorTools, instructions: item.body } };
}
