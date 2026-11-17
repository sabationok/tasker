import type { ReactNode } from 'react';
import { FlexBox } from '../layout/flex';

/** @ui EmptyState @spec Centered icon + text + optional action for empty lists. @keywords empty, no data, placeholder */
export const EmptyState = ({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) => (
  <FlexBox align="center" gap="md" className="px-6 py-12 text-center text-muted">
    {icon}
    <p className="text-sm">{title}</p>
    {action}
  </FlexBox>
);
