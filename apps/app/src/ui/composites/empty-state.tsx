import type { ReactNode } from 'react';
import { FlexBox } from '../layout/flex';
import { Text } from '../primitives/text';
import { Icon, type IconName } from '../theme/icons';

/** @ui EmptyState @spec Centered icon + text + optional action for empty lists. @keywords empty, no data, placeholder */
export const EmptyState = ({ icon, title, action, tone = 'muted' }: { icon?: IconName; title: string; action?: ReactNode; tone?: 'muted' | 'danger' }) => (
  <FlexBox align="center" gap="md" className="px-6 py-12 text-center">
    {icon && <Icon name={icon} size="xl" className={tone === 'danger' ? 'text-negative' : 'text-muted'} />}
    <Text variant="label" tone={tone}>
      {title}
    </Text>
    {action}
  </FlexBox>
);
