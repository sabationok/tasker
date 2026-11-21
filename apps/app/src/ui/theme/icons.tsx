import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  Globe,
  Send,
  Bell,
  Book,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock,
  AlignLeft,
  Dumbbell,
  FileClock,
  Flag,
  GitBranch,
  Grid2x2,
  HandHeart,
  Heart,
  ListChecks,
  ListTodo,
  Loader2,
  Lock,
  Minus,
  Palette,
  Pencil,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  Trees,
  Wallet,
  X,
  type LucideIcon,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * THE ICON SET. Screens name icons by meaning (`<Icon name="back" />`); this registry maps meanings to glyphs.
 * Swapping the icon library = replacing this file. `category:*` keys are the server's category `icon` values.
 */
const ICONS = {
  today: CalendarCheck,
  habits: ListTodo,
  tasks: CheckSquare,
  stats: BarChart3,
  add: Plus,
  habit: Sparkles,
  periodic: Repeat,
  task: CircleCheckBig,
  calendar: CalendarDays,
  clock: Clock,
  description: AlignLeft,
  back: ChevronLeft,
  prev: ChevronLeft,
  next: ChevronRight,
  forward: ChevronRight,
  check: Check,
  close: X,
  partial: Minus,
  failed: X,
  spinner: Loader2,
  error: AlertCircle,
  'move-up': ArrowUp,
  'move-down': ArrowDown,
  delete: Trash2,
  edit: Pencil,
  priority: Flag,
  threads: GitBranch,
  checklist: ListChecks,
  locked: Lock,
  reminder: Bell,
  archive: Archive,
  restore: ArchiveRestore,
  drafts: FileClock,
  ai: Bot,
  'runtime-telegram': Send,
  'runtime-browser': Globe,
  connector: Plug,
  'category:grid': Grid2x2,
  'category:heart': Heart,
  'category:book': Book,
  'category:briefcase': Briefcase,
  'category:wallet': Wallet,
  'category:palette': Palette,
  'category:dumbbell': Dumbbell,
  'category:tree': Trees,
  'category:sparkles': Sparkles,
  'category:hand-heart': HandHeart,
  'category:unknown': Tag,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
const SIZE = { xs: 'size-3', sm: 'size-4', md: 'size-5', lg: 'size-6', xl: 'size-8' } as const;
export type IconSize = keyof typeof SIZE;

/** @ui Icon @spec A glyph by meaning from the theme's icon set; decorative unless `label` is given. @keywords icon, glyph, symbol */
export function Icon({ name, size = 'sm', label, className, spin }: { name: IconName; size?: IconSize; label?: string; className?: string; spin?: boolean }) {
  const Glyph = ICONS[name] ?? Tag;
  return <Glyph className={cn(SIZE[size], spin && 'animate-spin', className)} aria-hidden={!label} aria-label={label} role={label ? 'img' : undefined} />;
}

/** Category icon key from the server's `icon` string; unknown values fall back. */
export const categoryIconName = (icon: string | undefined): IconName => {
  const key = `category:${icon}` as IconName;
  return key in ICONS ? key : 'category:unknown';
};
