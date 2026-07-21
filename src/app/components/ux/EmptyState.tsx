import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <Card className={`p-8 md:p-10 text-center ${className}`} role="status" aria-live="polite">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && actionHref ? (
          <Link to={actionHref}>
            <Button aria-label={actionLabel}>{actionLabel}</Button>
          </Link>
        ) : null}
        {actionLabel && onAction ? (
          <Button onClick={onAction} aria-label={actionLabel}>
            {actionLabel}
          </Button>
        ) : null}
        {secondaryActionLabel && secondaryActionHref ? (
          <Link to={secondaryActionHref}>
            <Button variant="outline" aria-label={secondaryActionLabel}>
              {secondaryActionLabel}
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
