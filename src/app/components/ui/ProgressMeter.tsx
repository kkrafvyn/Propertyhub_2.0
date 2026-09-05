import { cn } from "./utils";

export type ProgressMeterColor =
  | "emerald"
  | "amber"
  | "terracotta"
  | "indigo"
  | "purple"
  | "primary";

export interface ProgressMeterProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  valueDisplay?: string;
  color?: ProgressMeterColor;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  shimmer?: boolean;
  className?: string;
}

const colorGradients: Record<ProgressMeterColor, string> = {
  emerald: "from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300",
  amber: "from-amber-500 to-yellow-400 dark:from-amber-400 dark:to-yellow-300",
  terracotta: "from-brand-orange to-rose-400 dark:from-brand-orange dark:to-amber-400",
  indigo: "from-indigo-500 to-blue-400 dark:from-indigo-400 dark:to-cyan-300",
  purple: "from-purple-500 to-indigo-400 dark:from-purple-400 dark:to-indigo-300",
  primary: "from-primary to-emerald-600 dark:from-primary dark:to-teal-400",
};

const trackGlows: Record<ProgressMeterColor, string> = {
  emerald: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
  amber: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
  terracotta: "shadow-[0_0_12px_rgba(224,122,95,0.35)]",
  indigo: "shadow-[0_0_12px_rgba(99,102,241,0.35)]",
  purple: "shadow-[0_0_12px_rgba(168,85,247,0.35)]",
  primary: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
};

const sizeHeights: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export function ProgressMeter({
  value,
  max = 100,
  label,
  valueDisplay,
  color = "emerald",
  size = "md",
  showPercentage = false,
  shimmer = true,
  className = "",
}: ProgressMeterProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || valueDisplay || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-ink-secondary">{label}</span>}
          <div className="ml-auto flex items-center gap-1.5 font-semibold text-ink">
            {valueDisplay ? (
              <span>{valueDisplay}</span>
            ) : showPercentage ? (
              <span>{percentage}%</span>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-surface-subtle dark:bg-card/90 border border-surface-border/60",
          sizeHeights[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "Progress"}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out relative",
            colorGradients[color],
            trackGlows[color]
          )}
          style={{ width: `${percentage}%` }}
        >
          {shimmer && percentage > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer-slide_2s_infinite]" />
          )}
        </div>
      </div>
    </div>
  );
}
