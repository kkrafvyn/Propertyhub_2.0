import type { ReactNode } from "react";

type WorkspaceHeroTone = "neutral" | "emerald" | "finance";

const HERO_TONE_CLASS: Record<WorkspaceHeroTone, string> = {
  neutral:
    "from-primary/8 via-surface/90 to-surface/80 border-surface-border/80",
  emerald:
    "from-emerald-500/10 via-primary/5 to-surface/80 border-emerald-500/20",
  finance:
    "from-emerald-500/10 via-primary/5 to-surface/80 border-emerald-500/20",
};

export interface WorkspacePageShellProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: WorkspaceHeroTone;
  children: ReactNode;
}

/** Shared workspace page chrome — app-ui tokens + consistent header layout. */
export function WorkspacePageShell({
  title,
  description,
  badge,
  meta,
  actions,
  tone = "neutral",
  children,
}: WorkspacePageShellProps) {
  return (
    <div className="space-y-6">
      <header className="workspace-page-header">
        <div
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br app-surface-card ${HERO_TONE_CLASS[tone]}`}
        >
          <div
            className="pointer-events-none absolute top-0 right-0 h-64 w-64 bg-radial from-primary/10 via-transparent to-transparent blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
