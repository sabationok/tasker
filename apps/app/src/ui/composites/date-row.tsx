import { forwardRef, type InputHTMLAttributes } from 'react';
import { intlLocale, tr } from '@/i18n';
import { formatDay } from '@/lib/dates';
import { IconTile } from './icon-tile';
import { NavRow } from './nav-row';

/**
 * @ui DateRow
 * @spec A NavRow over a native date input (tap opens the system picker); `shown` is the current value for the label.
 * @keywords date picker, date row, calendar field
 */
export const DateRow = forwardRef<HTMLInputElement, { label: string; shown: string } & InputHTMLAttributes<HTMLInputElement>>(function DateRow({ label, shown, ...input }, ref) {
  return (
    <div className="relative">
      <NavRow icon={<IconTile icon="calendar" size="sm" />} label={label} value={shown ? formatDay(shown, intlLocale) : tr('No date')} />
      <input ref={ref} type="date" aria-label={label} className="absolute inset-0 w-full opacity-0" {...input} />
    </div>
  );
});
