import type { ReactNode } from 'react';
import { FlexRow } from '../layout/flex';
import { Text } from '../primitives/text';

/** @ui TopBar @spec Sticky bar for full-screen forms: leading action, centred title, trailing action. @keywords top bar, header, app bar, form header */
export const TopBar = ({ leading, title, trailing }: { leading?: ReactNode; title: string; trailing?: ReactNode }) => (
  <FlexRow justify="between" className="sticky top-0 z-10 -mx-page bg-bg px-page py-2">
    <span className="flex size-icon-btn items-center">{leading}</span>
    <Text variant="heading" truncate>
      {title}
    </Text>
    <span className="flex size-icon-btn items-center justify-end">{trailing}</span>
  </FlexRow>
);
