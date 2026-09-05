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
      className={`relative overflow-hidden p-8 sm:p-12 text-center border-surface-border bg-gradient-to-b from-surface to-surface-subtle shadow-card ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-primary/8 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {Icon && (
          <div className="mx-auto mb-5 relative flex h-16 w-16 items-center justify-center">
            {/* Outer halo ring */}
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-sm scale-110" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent text-primary shadow-sm">
              <Icon className="h-6 w-6 stroke-[1.8]" aria-hidden="true" />
            </div>
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
              <Button size="sm" aria-label={actionLabel} className="shadow-xs">
                {actionLabel}
              </Button>
            </Link>
          )}
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction} aria-label={actionLabel} className="shadow-xs">
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
      </div>
    </Card>
  );
}
