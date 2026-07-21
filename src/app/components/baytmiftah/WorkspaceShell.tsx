import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { DesktopShell } from "./DesktopShell";
import type { ShellNavLink } from "../../lib/workspace-shell-nav";
import { useTranslation } from "../../i18n/LocaleContext";

interface WorkspaceShellProps {
  workspaceLabel: string;
  homePath: string;
  links: ShellNavLink[];
  children: ReactNode;
  headerAction?: ReactNode;
}

export function WorkspaceShell({
  workspaceLabel,
  links,
  children,
  headerAction,
}: WorkspaceShellProps) {
  const { t } = useTranslation();

  return (
    <DesktopShell minimal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-ink-secondary">
            {workspaceLabel}
          </p>
        </div>
        {headerAction}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,minmax(0,1fr)]">
        <aside className="panel-card h-fit p-3 lg:sticky lg:top-24">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {links.map((link) => (
              <NavLink
                key={`${link.to}-${link.label}`}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `workspace-nav-link flex shrink-0 items-center gap-2 ${isActive ? "active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 hidden border-t border-surface-border pt-4 lg:block">
            <Link to="/" className="text-sm text-ink-secondary transition hover:text-ink hover:underline">
              {t("common.backToHome")}
            </Link>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </DesktopShell>
  );
}
