import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { Card } from "./Card";
import { cn } from "./utils";

export interface MetricTrend {
  value: string;
  isPositive?: boolean;
  label?: string;
}

export interface MetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  iconColor?: "emerald" | "amber" | "terracotta" | "indigo" | "purple" | "primary";
  trend?: MetricTrend;
  badge?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
  glow?: boolean | "emerald" | "amber" | "terracotta" | "indigo" | "purple" | "primary";
}

const haloClasses: Record<string, string> = {
  emerald: "metric-halo-emerald",
  amber: "metric-halo-amber",
  terracotta: "metric-halo-terracotta",
  indigo: "metric-halo-indigo",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs",
  primary: "metric-halo-primary",
};

const glowClasses: Record<string, string> = {
  emerald: "shadow-[0_0_24px_rgba(16,185,129,0.14)]",
  amber: "shadow-[0_0_24px_rgba(245,158,11,0.14)]",
  purple: "shadow-[0_0_24px_rgba(168,85,247,0.14)]",
  primary: "shadow-[0_0_24px_rgba(16,185,129,0.12)]",
  indigo: "shadow-[0_0_24px_rgba(99,102,241,0.14)]",
  terracotta: "shadow-[0_0_24px_rgba(224,122,95,0.14)]",
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "primary",
  trend,
  badge,
  action,
  onClick,
  className = "",
  glow = false,
}: MetricCardProps) {
  const effectiveGlowColor = typeof glow === "string" ? glow : iconColor;

  return (
    <Card
      variant="glass"
      hover={Boolean(onClick)}
      onClick={onClick}
      className={cn(
        "p-5 transition-all duration-300 relative group",
        Boolean(glow) && [
          "border-primary/30",
          glowClasses[effectiveGlowColor] || glowClasses.primary,
        ],
        className
      )}
    >
      {/* Subtle corner shimmer on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary truncate">
            {title}
          </p>

          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans leading-none">
              {value}
            </span>
            {badge}
          </div>

          {trend && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold text-[11px]",
                  trend.isPositive !== false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive !== false ? (
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 shrink-0" />
                )}
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-ink-muted text-[11px] truncate">{trend.label}</span>
              )}
            </div>
          )}

          {subtitle && !trend && (
            <p className="mt-2 text-[11px] text-ink-muted leading-relaxed truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "metric-halo transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0",
              haloClasses[iconColor]
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
          </div>
        )}
      </div>

      {action && (
        <div className="mt-4 pt-3 border-t border-surface-border/60">{action}</div>
      )}
    </Card>
  );
}
