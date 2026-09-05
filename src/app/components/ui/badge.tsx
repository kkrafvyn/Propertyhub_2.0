import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "border-surface-border bg-surface-subtle text-ink-secondary hover:bg-surface-hover",
        destructive: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
        outline: "border-surface-border text-ink bg-transparent hover:bg-surface-hover",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
        purple: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20",
        gold: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20",
        terracotta: "border-brand-orange/30 bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20",
        glass: "border-surface-border/80 bg-surface/75 backdrop-blur-md text-ink shadow-xs hover:border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: "emerald" | "amber" | "red" | "blue" | "purple";
  pulse?: boolean;
}

function Badge({
  className,
  variant,
  dot = false,
  dotColor = "emerald",
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const dotColorClasses: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotColorClasses[dotColor] || "bg-emerald-500",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

