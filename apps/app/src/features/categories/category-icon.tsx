import { categoryIconName, IconTile } from '@/ui';
import type { CategoryRef } from '@/contracts/tasker';

/** @ui CategoryIcon @spec A category's icon tile; its colour goes to the theme as `--tile-color`. @keywords category, icon, life area */
export const CategoryIcon = ({ category, size = 'md' }: { category: Pick<CategoryRef, 'icon' | 'color'> | null | undefined; size?: 'sm' | 'md' }) => (
  <IconTile icon={categoryIconName(category?.icon)} color={category?.color} size={size} />
);
