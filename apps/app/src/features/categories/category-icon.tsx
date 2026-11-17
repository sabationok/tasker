import { Book, Briefcase, Dumbbell, Grid2x2, HandHeart, Heart, Palette, Sparkles, Tag, Trees, Wallet, type LucideIcon } from 'lucide-react';
import { IconTile } from '@/ui';
import type { CategoryRef } from '@/contracts/tasker';

/** Category `icon` names from the server seed → lucide icons; unknown names fall back to a tag. */
const ICONS: Record<string, LucideIcon> = {
  grid: Grid2x2,
  heart: Heart,
  book: Book,
  briefcase: Briefcase,
  wallet: Wallet,
  palette: Palette,
  dumbbell: Dumbbell,
  tree: Trees,
  sparkles: Sparkles,
  'hand-heart': HandHeart,
};

/** @ui CategoryIcon @spec A category's icon in its colour tile. @keywords category, icon, life area */
export function CategoryIcon({ category, size = 40 }: { category: Pick<CategoryRef, 'icon' | 'color'> | null | undefined; size?: number }) {
  const Icon = (category && ICONS[category.icon]) || Tag;
  return (
    <IconTile color={category?.color} size={size}>
      <Icon className="size-[45%]" />
    </IconTile>
  );
}
