import { forwardRef, useId } from "react";
import { cn } from "./utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  description?: string;
  error?: string;
}

export const NativeSelectControl = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "min-h-11 rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));

NativeSelectControl.displayName = "NativeSelectControl";

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ label, description, error, className, id, children, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const descriptionId = description ? `${selectId}-description` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full space-y-2">
        <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <NativeSelectControl
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("w-full", error && "border-destructive focus:border-destructive focus:ring-destructive/20", className)}
          {...props}
        >
          {children}
        </NativeSelectControl>
        {description ? <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        {error ? <p id={errorId} className="text-sm text-destructive" role="alert">{error}</p> : null}
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";
