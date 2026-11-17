import type { ReactNode } from 'react';

/** @ui IconTile @spec Rounded square holding an icon, tinted by `color`. @keywords icon, avatar, tile, category icon */
export const IconTile = ({ color, children, size = 40 }: { color?: string; children: ReactNode; size?: number }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-xl"
    style={{ width: size, height: size, color: color ?? 'var(--t-accent)', background: `color-mix(in srgb, ${color ?? 'var(--t-accent)'} 14%, transparent)` }}
  >
    {children}
  </span>
);
