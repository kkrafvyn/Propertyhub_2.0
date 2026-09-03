import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again",
}: ErrorStateProps) {
  return (
    <Card
      className="relative overflow-hidden border-destructive/20 bg-destructive/5 p-8 text-center md:p-12 dark:bg-rose-950/10"
      role="alert"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-3xl" />

      <div className="relative z-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-xs dark:text-rose-400">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3 className="mb-2.5 text-xl font-serif font-medium tracking-tight text-ink md:text-2xl">
          {title}
        </h3>

        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-ink-secondary">
          {message}
        </p>

        {onRetry && (
          <Button onClick={onRetry} size="sm" className="gap-2" aria-label={retryLabel}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{retryLabel}</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
