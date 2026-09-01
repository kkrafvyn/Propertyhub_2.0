import React, { type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  ShieldAlert,
  Users,
  Building,
  CheckCircle,
  FileText,
  Activity,
  Settings,
  Bell,
} from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";
import { ThemeToggle } from "../components/baytmiftah/ThemeToggle";
import { UserMenu } from "../components/baytmiftah/UserMenu";

/**
 * Surface 6: Admin Web Shell
 * ──────────────────────────
 * Everyday platform administration through a web browser:
 * Users, Organizations, Listings Moderation, Trust Review, Fraud Alerts,
 * Complaints, Support escalations, and Platform Audit.
 */
export interface AdminWebShellProps {
  children: ReactNode;
}

export function AdminWebShell({ children }: AdminWebShellProps) {
  const location = useLocation();

  const adminNav = [
    { to: "/admin", label: "Dashboard", icon: Activity },
    { to: "/admin/trust-review", label: "Trust & KYC", icon: CheckCircle },
    { to: "/admin/fraud", label: "Fraud Radar", icon: ShieldAlert },
    { to: "/admin/revenue", label: "Revenue & Billing", icon: FileText },
  ];

  return (
    <div className="admin-web-shell min-h-screen bg-background text-foreground flex flex-col">
      {/* Admin Web Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-rose-900/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="bg-rose-950/80 text-rose-400 border border-rose-800 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
            Platform Admin
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? "bg-rose-900/40 text-rose-400 border border-rose-700/60"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
