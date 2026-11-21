import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** @ui PageFrame @spec The page column: max width, page padding, room for the tab bar when there is one. @keywords page, layout, frame, column */
export const PageFrame = ({ children, withTabBar, wide }: { children: ReactNode; withTabBar?: boolean; wide?: boolean }) => (
  <div className={cn('mx-auto min-h-dvh px-page pt-page', wide ? 'max-w-4xl' : 'max-w-md', withTabBar ? 'pb-28' : 'pb-10')}>{children}</div>
);
