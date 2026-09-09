type HtmlDivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

export type CardVariant =
  | "default"
  | "glass"
  | "gradient"
  | "interactive"
  | "glow"
  | "metric"
  | "outline";

interface CardProps extends HtmlDivProps {
  children: React.ReactNode;
  variant?: CardVariant;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-card/95 dark:bg-card/85 backdrop-blur-md border border-border/80 dark:border-white/[0.08] shadow-xs hover:shadow-card transition-all duration-300",
  glass:
    "bg-surface/85 dark:bg-card/75 backdrop-blur-xl border border-surface-border/80 dark:border-white/10 shadow-glass-card hover:shadow-glass-hover hover:border-primary/30 transition-all duration-300",
  gradient:
    "bg-gradient-to-br from-surface via-surface/90 to-surface-subtle dark:from-card dark:via-card/90 dark:to-surface-subtle/40 backdrop-blur-xl border border-surface-border dark:border-white/10 shadow-card hover:shadow-card-hover transition-all duration-300",
  interactive:
    "bg-surface/90 dark:bg-card/80 backdrop-blur-lg border border-surface-border dark:border-white/10 cursor-pointer shadow-xs hover:shadow-card-hover hover:border-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-200",
  glow:
    "bg-surface/95 dark:bg-card/90 backdrop-blur-xl border border-primary/20 dark:border-primary/30 shadow-[0_0_24px_rgba(16,185,129,0.12)] hover:shadow-[0_0_32px_rgba(16,185,129,0.22)] transition-all duration-300",
  metric:
    "bg-surface/90 dark:bg-card/85 backdrop-blur-xl border border-surface-border/90 dark:border-white/[0.08] shadow-card hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300",
  outline:
    "bg-transparent border border-surface-border dark:border-white/10 shadow-none transition-colors duration-200",
};

export function Card({
  children,
  variant = "default",
  hover = false,
  className = "",
  onClick,
  style,
  ...props
}: CardProps) {
  const baseClasses =
    "relative rounded-2xl overflow-hidden";
  const hoverClasses =
    hover && variant !== "interactive"
      ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover hover:border-primary/30 active:translate-y-0 transition-all duration-200"
      : "";

  return (
    <div
      className={`${baseClasses} ${variantStyles[variant] || variantStyles.default} ${hoverClasses} ${className}`}
      onClick={onClick}
      style={{
        boxShadow:
          variant === "glass"
            ? "var(--shadow-glass-card), var(--border-sheen)"
            : variant === "metric" || variant === "gradient"
            ? "var(--shadow-card), var(--border-sheen)"
            : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

