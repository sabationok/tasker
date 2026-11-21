import { Icon } from '../theme/icons';

/** @ui DatePickerButton @spec An icon button that opens the system date picker (native input under it). @keywords date picker, calendar button, jump to date */
export const DatePickerButton = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="relative inline-flex size-icon-btn items-center justify-center rounded-pill bg-sunken" title={label}>
    <Icon name="calendar" />
    <input type="date" aria-label={label} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0" />
  </label>
);
