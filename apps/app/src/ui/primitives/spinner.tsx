import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/** @ui Spinner @spec Inline loading indicator. @keywords loading, spinner, busy */
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden />;
