import type { Tally } from '@/contracts/tasker';

/** Status series → theme tokens (reserved: never reused as other series), always shown with a label. */
export const STATUS_SERIES: { key: keyof Tally; label: string; color: string }[] = [
  { key: 'completed', label: 'Completed', color: 'var(--t-positive)' },
  { key: 'failed', label: 'Failed', color: 'var(--t-negative)' },
  { key: 'skipped', label: 'Skipped', color: 'var(--t-neutral)' },
];
