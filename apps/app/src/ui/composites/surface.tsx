import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Surface
 * @spec The one container look (background, radius, elevation). padding: none | card. Everything boxed sits on a Surface.
 * @keywords card, surface, panel, container, box
 */
export function Surface({ children, padding = 'card', as: Tag = 'div' }: { children: ReactNode; padding?: 'none' | 'card'; as?: 'div' | 'section' | 'ul' }) {
  return <Tag className={cn('rounded-card bg-surface shadow-raised', padding === 'card' ? 'flex flex-col gap-3 p-card' : 'overflow-hidden')}>{children}</Tag>;
}
