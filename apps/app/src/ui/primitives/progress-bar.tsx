/** @ui ProgressBar @spec Thin horizontal progress 0–100. @keywords progress, bar, percent, meter */
export const ProgressBar = ({ percent, label }: { percent: number; label: string }) => (
  <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-line">
    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
  </div>
);
