import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../theme/icons';

/**
 * @ui IconTile
 * @spec An icon in a tile. `color` (e.g. a category's colour from the API) is handed to the theme as `--tile-color`;
 * the theme's `tile` tokens decide whether and how it shows.
 * @keywords icon, avatar, tile, category icon
 */
export const IconTile = ({ icon, color, size = 'md' }: { icon: IconName; color?: string; size?: 'sm' | 'md' }) => (
  <span
    data-tile
    className={cn('inline-flex shrink-0 items-center justify-center rounded-control', size === 'md' ? 'size-tile' : 'size-[calc(var(--t-tile)*0.8)]')}
    style={color ? ({ '--tile-color': color } as React.CSSProperties) : undefined}
  >
    <Icon name={icon} />
  </span>
);
