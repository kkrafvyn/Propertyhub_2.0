import { forwardRef } from "react";
import { cn } from "./utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  default: "bg-primary text-primary-foreground shadow-[0_14px_32px_rgba(255,56,92,0.20)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(255,56,92,0.26)]",
  primary: "bg-primary text-primary-foreground shadow-[0_14px_32px_rgba(255,56,92,0.20)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(255,56,92,0.26)]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-primary/10",
  ghost: "hover:bg-secondary text-foreground",
  outline: "border border-border bg-white/88 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5 hover:text-primary",
};

const sizes = {
  default: "px-5 py-2.5",
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5",
  lg: "px-6 py-3.5 text-base",
  icon: "h-10 w-10 p-0",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}) {
  return cn(baseStyles, variants[variant], sizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
