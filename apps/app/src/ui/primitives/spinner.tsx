import { Icon, type IconSize } from '../theme/icons';

/** @ui Spinner @spec Inline loading indicator. @keywords loading, spinner, busy */
export const Spinner = ({ size = 'sm' }: { size?: IconSize }) => <Icon name="spinner" size={size} spin />;
