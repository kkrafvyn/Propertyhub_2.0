import React, { type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Logo } from "../components/baytmiftah/Logo";
import { ThemeToggle } from "../components/baytmiftah/ThemeToggle";
import { UserMenu } from "../components/baytmiftah/UserMenu";
import LanguageSwitcher from "../components/baytmiftah/LanguageSwitcher";
import { NotificationBell } from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";
import { useSurface } from "../context/SurfaceContext";
import { Laptop } from "lucide-react";

/**
 * Surface 3: Business Web Shell
 * ─────────────────────────────
 * Browser-based company operations for sales, leasing, property management,
 * customer CRM, maintenance, finance, and team coordination.
 */
export interface BusinessWebShellProps {
  children: ReactNode;
  organizationName?: string;
  organizationSlug?: string;
}

export function BusinessWebShell({
  children,
  organizationName,
  organizationSlug,
}: BusinessWebShellProps) {
  const { user } = useAuth();
  const { isDesktop } = useSurface();
  const location = useLocation();

  return (
    <div className="business-web-shell min-h-screen bg-surface-base text-ink flex flex-col">
      {/* Top Banner recommending Desktop app for heavy accounting if on web */}
      {!isDesktop && (
        <div className="bg-primary-900/10 border-b border-primary-800/20 text-xs px-4 py-1.5 flex items-center justify-between text-ink-secondary">
          <div className="flex items-center gap-2">
            <Laptop className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
            <span>
              <strong>BaytMiftah Desktop</strong> unlocks heavy ERP modules: General Ledger, Procurement, & Multi-Portfolio Analytics.
            </span>
          </div>
          <Link
            to="/workspace/desktop?force=1"
            className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
          >
            Get Desktop →
          </Link>
        </div>
      )}

      {/* Main Workspace Header */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          {organizationName && (
            <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Org</span>
              <span className="text-sm font-bold text-ink">{organizationName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {user && <NotificationBell userId={user.id} />}
          <UserMenu />
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
