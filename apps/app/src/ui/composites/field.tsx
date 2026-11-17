import type { ReactNode } from 'react';
import { FlexBox } from '../layout/flex';

/**
 * @ui Field
 * @spec Label + control + hint / error chrome. Controls never render their own label or error.
 * @keywords field, label, form row, error, hint
 */
export function Field({ label, htmlFor, hint, error, children }: { label?: string; htmlFor?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <FlexBox gap="xs">
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint && <p className="text-xs text-muted">{hint}</p>}
    </FlexBox>
  );
}
