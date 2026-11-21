import type { ReactNode } from 'react';
import { tr } from '@/i18n';
import { Badge } from '../primitives/badge';
import { Text } from '../primitives/text';
import { FlexRow } from '../layout/flex';
import { Surface } from './surface';

/**
 * @ui SectionCard
 * @spec A form / page block: heading, optional «required» / «optional» marker, actions slot, body — on a Surface.
 * @keywords section, card, panel, group, block
 */
export function SectionCard({ title, marker, actions, children }: { title?: string; marker?: 'required' | 'optional'; actions?: ReactNode; children: ReactNode }) {
  return (
    <Surface as="section">
      {(title || actions) && (
        <FlexRow justify="between">
          <FlexRow>
            {title && <Text variant="heading">{title}</Text>}
            {marker && <Badge tone={marker === 'required' ? 'caution' : 'neutral'}>{tr(marker)}</Badge>}
          </FlexRow>
          {actions}
        </FlexRow>
      )}
      {children}
    </Surface>
  );
}
