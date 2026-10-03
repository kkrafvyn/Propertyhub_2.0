import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { PageLoadingSkeleton } from "./LoadingSkeleton";

export type OperationalQueryPhase =
  | "loading"
  | "error"
  | "empty"
  | "filtered-empty"
  | "ready";

export interface OperationalQueryStateProps {
  phase: OperationalQueryPhase;
  /** When true during loading, keep showing `children` with a stale banner. */
  hasStaleData?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  loadingFallback?: ReactNode;
  staleBanner?: ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  onEmptyAction?: () => void;
  filteredEmptyTitle?: string;
  filteredEmptyDescription?: string;
  children?: ReactNode;
}

function DefaultStaleBanner() {
  return (
    <div
      className="mb-4 flex items-start gap-2 rounded-xl border border-surface-border bg-secondary px-4 py-3 text-sm text-ink-secondary"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>Showing saved data while we refresh. Some numbers may be out of date.</p>
    </div>
  );
}

/** Distinguishes loading, fetch errors, empty, and filtered-empty — never empty UI on fetch failure. */
export function OperationalQueryState({
  phase,
  hasStaleData = false,
  errorTitle,
  errorMessage = "We couldn't load this data. Check your connection and try again.",
  onRetry,
  retryLabel,
  loadingFallback,
  staleBanner,
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptyDescription = "There is no data to show in this view.",
  emptyActionLabel,
  emptyActionHref,
  onEmptyAction,
  filteredEmptyTitle = "No matches",
  filteredEmptyDescription = "Try adjusting your filters or search terms.",
  children,
}: OperationalQueryStateProps) {
  if (phase === "error") {
    return (
      <ErrorState
        title={errorTitle}
        message={errorMessage}
        onRetry={onRetry}
        retryLabel={retryLabel}
      />
    );
  }

  if (phase === "loading" && !hasStaleData) {
    return <>{loadingFallback ?? <PageLoadingSkeleton />}</>;
  }

  if (phase === "empty") {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
        onAction={onEmptyAction}
      />
    );
  }

  if (phase === "filtered-empty") {
    return (
      <EmptyState
        icon={emptyIcon}
        title={filteredEmptyTitle}
        description={filteredEmptyDescription}
        actionLabel={emptyActionLabel}
        actionHref={emptyActionHref}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      {phase === "loading" && hasStaleData ? staleBanner ?? <DefaultStaleBanner /> : null}
      {children}
    </>
  );
}
