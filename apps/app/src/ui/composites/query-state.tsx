import type { ReactNode } from 'react';
import { tr } from '@/i18n';
import { FlexRow } from '../layout/flex';
import { Button } from '../primitives/button';
import { Spinner } from '../primitives/spinner';
import { EmptyState } from './empty-state';

/**
 * @ui QueryState
 * @spec Renders loading / error (with retry) for a query, else its children.
 * @keywords loading, error, retry, async, query
 */
export function QueryState({ isLoading, error, onRetry, children }: { isLoading: boolean; error: unknown; onRetry?: () => void; children: ReactNode }) {
  if (isLoading)
    return (
      <FlexRow justify="center" className="py-12">
        <Spinner size="lg" />
      </FlexRow>
    );
  if (error)
    return (
      <EmptyState
        icon="error"
        tone="danger"
        title={tr((error as Error).message || 'Something went wrong')}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {tr('Retry')}
            </Button>
          )
        }
      />
    );
  return <>{children}</>;
}
