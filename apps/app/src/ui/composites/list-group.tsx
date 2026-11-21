import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * @ui ListGroup / ListRow
 * @spec A list on one Surface with dividers. ListRow: leading, content, trailing; `to` makes the main area a link, `onPress` a button.
 * @keywords list, rows, list item, divided list, table rows
 */
export function ListGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="overflow-hidden rounded-card bg-surface shadow-raised">
      {children}
    </ul>
  );
}

export function ListRow({ leading, children, trailing, to, onPress }: { leading?: ReactNode; children: ReactNode; trailing?: ReactNode; to?: string; onPress?: () => void }) {
  const main = 'flex min-w-0 flex-1 items-center gap-3 text-left';
  const body = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </>
  );
  return (
    <li className="flex items-center gap-3 border-b border-line px-row py-row last:border-0">
      {to ? (
        <Link to={to} className={main}>
          {body}
        </Link>
      ) : onPress ? (
        <button type="button" onClick={onPress} className={main}>
          {body}
        </button>
      ) : (
        <div className={main}>{body}</div>
      )}
      {trailing}
    </li>
  );
}

/** @ui ListRowMeta @spec The wrapping row of badges under a ListRow title. @keywords meta, badges row */
export const ListRowMeta = ({ children }: { children: ReactNode }) => <div className={cn('flex flex-wrap items-center gap-1')}>{children}</div>;
