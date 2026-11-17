import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FlexBox } from '../layout/flex';

/**
 * @ui NavRow
 * @spec A tappable row: leading icon, label, value under it, trailing slot (chevron by default). Used for pickers in forms.
 * @keywords row, list item, picker trigger, setting, chevron
 */
export function NavRow({ icon, label, value, trailing, onClick, className }: { icon?: ReactNode; label: string; value?: ReactNode; trailing?: ReactNode; onClick?: () => void; className?: string }) {
  const body = (
    <>
      {icon}
      <FlexBox fill gap="none" className="text-left">
        <span className="text-[15px] font-medium text-fg">{label}</span>
        {value !== undefined && <span className="truncate text-[13px] text-muted">{value}</span>}
      </FlexBox>
      {trailing ?? (onClick && <ChevronRight className="size-4 text-muted" />)}
    </>
  );
  const cls = cn('flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition hover:bg-surface-2')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
