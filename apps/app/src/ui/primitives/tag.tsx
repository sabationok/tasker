import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Tag
 * @spec Pastel pill for a kind, a category, a status. hue: violet | rose | mint | amber | sky | grey (theme `tag-*` tokens).
 * @keywords tag, pill, label, status pill, category tag
 */
const HUE = {
  violet: 'bg-tag-violet text-tag-violet-ink',
  rose: 'bg-tag-rose text-tag-rose-ink',
  mint: 'bg-tag-mint text-tag-mint-ink',
  amber: 'bg-tag-amber text-tag-amber-ink',
  sky: 'bg-tag-sky text-tag-sky-ink',
  grey: 'bg-tag-grey text-tag-grey-ink',
} as const;
export type TagHue = keyof typeof HUE;

export const Tag = ({ hue = 'grey', children }: { hue?: TagHue; children: ReactNode }) => (
  <span className={cn('inline-flex h-6 items-center rounded-pill px-2.5 text-caption font-medium', HUE[hue])}>{children}</span>
);
