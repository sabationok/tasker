/** @ui ProgressBar @spec Thin horizontal progress 0–100. @keywords progress, bar, percent, meter */
export const ProgressBar = ({ percent, label }: { percent: number; label: string }) => (
  <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-pill bg-line">
    <div className="h-full rounded-pill bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
  </div>
);
