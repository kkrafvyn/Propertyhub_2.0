import type { ReactNode } from "react";
import { Label } from "../ui/label";

export interface FormRowProps {
  htmlFor?: string;
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Label + control stack for inquiry and workspace forms. */
export function FormRow({ htmlFor, label, hint, children, className }: FormRowProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-2 block">
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
