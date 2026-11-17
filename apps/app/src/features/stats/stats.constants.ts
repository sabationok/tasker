import type { Tally } from '@/contracts/tasker';

/** Status colours (reserved: never reused as series colours), always shown with a label. */
export const STATUS_SERIES: { key: keyof Tally; label: string; color: string }[] = [
  { key: 'completed', label: 'Completed', color: 'var(--t-success)' },
  { key: 'failed', label: 'Failed', color: 'var(--t-danger)' },
  { key: 'skipped', label: 'Skipped', color: 'var(--t-muted)' },
];
