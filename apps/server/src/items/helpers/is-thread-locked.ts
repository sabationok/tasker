import type { ItemEntity } from '../entities/item.entity';

/** In a sequential parent only the first undone child (by position) is actionable; returns the locked child ids. */
export function lockedChildIds(parent: Pick<ItemEntity, 'subtasksOrder'>, childrenByPosition: Pick<ItemEntity, 'id' | 'status'>[]): Set<string> {
  if (parent.subtasksOrder !== 'sequential') return new Set();
  const open = childrenByPosition.filter((c) => c.status !== 'done' && c.status !== 'archived');
  return new Set(open.slice(1).map((c) => c.id));
}
