import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { tr } from '@/i18n';
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
      <div className="flex justify-center py-12 text-muted">
        <Spinner className="size-6" />
      </div>
    );
  if (error)
    return (
      <EmptyState
        icon={<AlertCircle className="size-8 text-danger" />}
        title={tr((error as Error).message || 'Something went wrong')}
        action={onRetry && <Button variant="secondary" onClick={onRetry}>{tr('Retry')}</Button>}
      />
    );
  return <>{children}</>;
}
