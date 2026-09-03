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
    <Card
      className={`p-8 md:p-12 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}

      <h3 className="mb-2 text-xl font-serif font-medium tracking-tight text-ink">
        {title}
      </h3>

      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-ink-secondary">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && actionHref && (
          <Link to={actionHref}>
            <Button size="sm" aria-label={actionLabel}>
              {actionLabel}
            </Button>
          </Link>
        )}
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} aria-label={actionLabel}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Link to={secondaryActionHref}>
            <Button variant="outline" size="sm" aria-label={secondaryActionLabel}>
              {secondaryActionLabel}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
