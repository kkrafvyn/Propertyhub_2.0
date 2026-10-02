import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    description,
    className = "",
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block mb-2 text-sm text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          className={`w-full min-h-11 px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-60 ${error ? "border-destructive focus:ring-destructive/30" : ""} ${className}`}
          {...props}
        />
        {description && (
          <p id={descriptionId} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
