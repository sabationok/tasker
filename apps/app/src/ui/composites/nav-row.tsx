import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FlexBox } from '../layout/flex';
import { Text } from '../primitives/text';
import { Icon } from '../theme/icons';

/**
 * @ui NavRow
 * @spec A form row: leading node, label, value under it, trailing slot (a chevron when tappable). Used for pickers and switches.
 * @keywords row, picker trigger, setting, chevron
 */
export function NavRow({ icon, label, value, trailing, onClick }: { icon?: ReactNode; label: string; value?: ReactNode; trailing?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      {icon}
      <FlexBox fill gap="none" className="text-left">
        <Text variant="strong">{label}</Text>
        {value !== undefined && (
          <Text variant="label" tone="muted" truncate>
            {value}
          </Text>
        )}
      </FlexBox>
      {trailing ?? (onClick && <Icon name="forward" className="text-muted" />)}
    </>
  );
  const cls = 'flex min-h-control-lg w-full items-center gap-3 rounded-control border border-line bg-surface px-row py-2';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition hover:bg-sunken')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
