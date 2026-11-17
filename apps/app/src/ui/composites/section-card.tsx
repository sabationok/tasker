import type { ReactNode } from 'react';
import { tr } from '@/i18n';
import { cn } from '@/lib/cn';
import { Badge } from '../primitives/badge';
import { FlexRow, FlexSection } from '../layout/flex';

/**
 * @ui SectionCard
 * @spec A form / page block on a surface: title, optional «required» / «optional» marker, actions slot, body.
 * @keywords section, card, panel, group, block
 */
export function SectionCard({ title, marker, actions, children, className }: { title?: string; marker?: 'required' | 'optional'; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <FlexSection gap="md" className={cn('rounded-2xl bg-surface p-4', className)}>
      {(title || actions) && (
        <FlexRow justify="between">
          <FlexRow>
            {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
            {marker && <Badge tone={marker === 'required' ? 'danger' : 'warning'}>{tr(marker)}</Badge>}
          </FlexRow>
          {actions}
        </FlexRow>
      )}
      {children}
    </FlexSection>
  );
}

