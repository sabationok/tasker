import type { ChecklistLineView } from '../../checklist/checklist.service';
import type { ReminderView } from '../../reminders/reminders.service';
import type { Recurrence } from '../../recurrence/recurrence.schema';
import type { ItemEvaluation, ItemSource, ItemStatus, ItemType, SubtasksOrder } from './item.types';

export type CategoryRef = { id: string; name: string; icon: string; color: string };

/** An item as REST and MCP return it. */
export type ItemView = {
  id: string;
  shortId: number;
  type: ItemType;
  title: string;
  body: string | null;
  status: ItemStatus;
  /** `me` or an agent's slug. */
  assignee: string;
  /** `me` or an agent's slug. */
  createdBy: string;
  /** The hub connector an agent's to-do is about. */
  connector: string | null;
  /** The connector's tools it uses (matched by the hub). */
  connectorTools: string[] | null;
  priority: number | null;
  date: string | null;
  dueAt: string | null;
  pending: boolean;
  parentId: string | null;
  position: number;
  subtasksOrder: SubtasksOrder;
  recurrence: Recurrence | null;
  startsOn: string | null;
  endsOn: string | null;
  evaluation: ItemEvaluation;
  source: ItemSource | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: CategoryRef | null;
  project: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  checklist: ChecklistLineView[];
  reminders: ReminderView[];
  threads: { done: number; total: number } | null;
  locked: boolean;
};
