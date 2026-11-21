import type { ReactNode } from 'react';
import { tr } from '@/i18n';
import { useViewport } from '@/lib/viewport';
import { EmptyState, FlexBox } from '@/ui';

/** The smallest size the screens are laid out for; below it they are not rendered at all. */
export const MIN_APP_WIDTH = 320;
export const MIN_APP_HEIGHT = 380;
/** Below this width the tab bar drops its labels (icons only, shorter). */
export const COMPACT_WIDTH = 380;

/**
 * Renders the app only when it has at least MIN_APP_WIDTH × MIN_APP_HEIGHT (the visible size: window or host panel);
 * smaller, a notice instead of a squeezed or clipped layout. Screens unmount while hidden and mount again when there is room.
 */
export function MinWidthGate({ children }: { children: ReactNode }) {
  const { width, height } = useViewport();
  if (width >= MIN_APP_WIDTH && height >= MIN_APP_HEIGHT) return children;
  return (
    <FlexBox gap="md" className="min-h-dvh justify-center px-2">
      <EmptyState title={tr('Tasker needs a window at least {w} × {h} px.', { w: MIN_APP_WIDTH, h: MIN_APP_HEIGHT })} />
    </FlexBox>
  );
}
