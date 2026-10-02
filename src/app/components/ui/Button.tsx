import { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "./utils";

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive"
  | "link"
  | "glass"
  | "gradient"
  | "terracotta";

type ButtonSize = "default" | "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] border border-primary/20",
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] border border-primary/20",
  secondary:
    "bg-surface text-ink hover:bg-surface-hover border border-surface-border shadow-xs hover:border-primary/30 active:scale-[0.98]",
  ghost:
    "hover:bg-surface-hover text-ink active:scale-[0.98]",
  outline:
    "border border-surface-border hover:bg-surface-hover hover:border-primary/40 text-ink shadow-xs active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs hover:shadow-md active:scale-[0.98]",
  link:
    "text-primary underline-offset-4 hover:underline",
  glass:
    "bg-surface/80 dark:bg-card/70 backdrop-blur-md border border-surface-border/80 dark:border-white/15 text-ink hover:bg-surface-hover shadow-xs active:scale-[0.98]",
  gradient:
    "bg-gradient-to-r from-primary via-emerald-800 to-primary text-white hover:opacity-95 shadow-md hover:shadow-lg active:scale-[0.98]",
  terracotta:
    "bg-gradient-to-r from-brand-orange to-[#c45d44] text-white hover:shadow-md active:scale-[0.98] shadow-[0_4px_14px_rgba(224,122,95,0.35)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm font-medium rounded-xl",
  sm: "px-3 py-1.5 text-xs font-semibold rounded-lg",
  md: "px-4 py-2.5 text-sm font-semibold rounded-xl",
  lg: "px-6 py-3.5 text-base font-semibold rounded-2xl",
  icon: "h-9 w-9 p-0 rounded-xl",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:transform-none",
    variantClasses[variant] ?? variantClasses.default,
    sizeClasses[size] ?? sizeClasses.default,
    className,
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={buttonVariants({ variant, size, className })}
        {...(props as object)}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
