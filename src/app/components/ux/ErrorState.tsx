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
      className="p-8 md:p-12 text-center border-destructive/20 dark:border-rose-500/20 bg-destructive/5 dark:bg-rose-950/10 backdrop-blur-md relative overflow-hidden"
      role="alert"
    >
      {/* Subtle Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-destructive/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:text-rose-400 border border-destructive/20 shadow-xs">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3 className="text-xl md:text-2xl font-serif font-medium tracking-tight text-foreground mb-2.5">
          {title}
        </h3>

        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
          {message}
        </p>

        {onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="h-10 px-5 rounded-xl font-medium shadow-xs gap-2 inline-flex items-center"
            aria-label={retryLabel}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
