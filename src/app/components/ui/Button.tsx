import { forwardRef } from "react";
import { cn } from "./utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  default: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
  primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
  ghost: "hover:bg-secondary text-foreground",
  outline: "border-2 border-border hover:bg-secondary text-foreground",
};

const sizes = {
  default: "px-5 py-2.5",
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5",
  lg: "px-6 py-3.5 text-lg",
  icon: "h-9 w-9 p-0",
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
