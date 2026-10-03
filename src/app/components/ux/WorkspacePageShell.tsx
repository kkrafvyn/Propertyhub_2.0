import type { ReactNode } from "react";

export interface WorkspacePageShellProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "emerald" | "finance";
  children: ReactNode;
}

/** Shared workspace page chrome — neutral card header, no decorative gradients. */
export function WorkspacePageShell({
  title,
  description,
  badge,
  meta,
  actions,
  children,
}: WorkspacePageShellProps) {
  return (
    <div className="space-y-6 min-w-0 w-full">
      <header className="workspace-page-header">
        <div className="app-surface-card rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 min-w-0">
              {(badge || meta) && (
                <div className="flex flex-wrap items-center gap-2">
                  {badge}
                  {meta}
                </div>
              )}
              <h1 className="app-page-title">{title}</h1>
              {description ? (
                <p className="app-page-description">{description}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
