import type { ReactNode } from 'react';
import { FlexBox } from '../layout/flex';
import { Text } from '../primitives/text';

/**
 * @ui Field
 * @spec Label + control + hint / error chrome. Controls never render their own label or error. `fill` lets it share a row.
 * @keywords field, label, form row, error, hint
 */
export function Field({ label, htmlFor, hint, error, fill, children }: { label?: string; htmlFor?: string; hint?: string; error?: string; fill?: boolean; children: ReactNode }) {
  return (
    <FlexBox gap="xs" fill={fill}>
      {label && (
        <Text variant="label" tone="muted" as="label" htmlFor={htmlFor}>
          {label}
        </Text>
      )}
      {children}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : (
        hint && (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        )
      )}
    </FlexBox>
  );
}
