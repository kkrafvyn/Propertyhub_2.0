import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  level?: "section" | "subsection";
}

/** Section title aligned with app-ui tokens (use inside pages that already have WorkspacePageShell). */
export function SectionHeader({
  title,
  description,
  actions,
  level = "section",
}: SectionHeaderProps) {
  const titleClass =
    level === "section" ? "app-page-title text-xl sm:text-2xl" : "text-lg font-semibold text-ink";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div className="min-w-0">
        <h2 className={titleClass}>{title}</h2>
        {description ? (
          <p className="app-page-description mt-1">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
