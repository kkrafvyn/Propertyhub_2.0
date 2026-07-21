import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { DesktopShell } from "./DesktopShell";

export interface WorkspaceNavItem {
  slug: string;
  label: string;
  icon?: ReactNode;
}

interface WorkspaceShellProps {
  title: string;
  subtitle?: string;
  navItems: WorkspaceNavItem[];
  basePath: string;
  activeSlug: string;
  children: ReactNode;
  action?: ReactNode;
}

export function WorkspaceShell({
  title,
  subtitle,
  navItems,
  basePath,
  activeSlug,
  children,
  action,
}: WorkspaceShellProps) {
  return (
    <DesktopShell minimal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="section-heading">{title}</h1>
          {subtitle && <p className="mt-2 text-base text-ink-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,minmax(0,1fr)]">
        <aside className="panel-card h-fit p-3 lg:sticky lg:top-24">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <NavLink
                key={item.slug}
                to={`${basePath}/${item.slug}`}
                end={item.slug === ""}
                className={({ isActive }) =>
                  `workspace-nav-link flex shrink-0 items-center gap-2 ${isActive || activeSlug === item.slug ? "active" : ""}`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 hidden border-t border-white/10 pt-4 lg:block">
            <Link to="/" className="text-sm text-ink-secondary hover:text-ink hover:underline">
              ← Back to marketplace
            </Link>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </DesktopShell>
  );
}
