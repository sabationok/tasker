import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** @ui ChartTooltip @spec The floating hover box over a chart, pinned to a corner. @keywords tooltip, chart hover, crosshair label */
export const ChartTooltip = ({ children, corner = 'right' }: { children: ReactNode; corner?: 'left' | 'right' }) => (
  <div className={cn('pointer-events-none absolute top-0 flex flex-col rounded-control border border-line bg-surface px-2 py-1 shadow-overlay', corner === 'right' ? 'right-0' : 'left-0')}>{children}</div>
);
