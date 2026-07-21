import { AlertCircle } from "lucide-react";
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
  retryLabel = "Retry",
}: ErrorStateProps) {
  return (
    <Card className="p-8 md:p-10 text-center border-destructive/20 bg-destructive/5" role="alert">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" aria-label={retryLabel}>
          {retryLabel}
        </Button>
      ) : null}
    </Card>
  );
}
