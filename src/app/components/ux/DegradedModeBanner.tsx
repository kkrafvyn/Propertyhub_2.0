import type { ReactNode } from "react";

export type DegradedModeTone = "warning" | "danger" | "info";

const toneClasses: Record<DegradedModeTone, string> = {
  warning:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
  danger:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100",
  info: "border-surface-border bg-surface-subtle text-ink-secondary",
};

export interface DegradedModeBannerProps {
  tone?: DegradedModeTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Shared alert for sandbox checkout, AI local FAQ, and other degraded product modes. */
export function DegradedModeBanner({
  tone = "warning",
  title,
  children,
  className = "",
}: DegradedModeBannerProps) {
  return (
    <div
      role="alert"
      className={`mb-6 rounded-xl border p-4 text-sm ${toneClasses[tone]} ${className}`}
    >
      {title ? <strong className="font-semibold">{title}</strong> : null}
      {title ? " " : null}
      {children}
    </div>
  );
}
