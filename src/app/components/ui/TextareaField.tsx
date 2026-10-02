import { forwardRef, useId } from "react";
import { Textarea } from "./textarea";

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, description, error, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full space-y-2">
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">{label}</label>
        <Textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {description ? <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        {error ? <p id={errorId} className="text-sm text-destructive" role="alert">{error}</p> : null}
      </div>
    );
  },
);

TextareaField.displayName = "TextareaField";
