import React, { type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  BellRing,
  ShieldAlert,
  CheckSquare,
  Flame,
  Radio,
  FileCheck2,
} from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";

/**
 * Surface 8: Admin Mobile Shell
 * ─────────────────────────────
 * Urgent platform actions only — does NOT replicate the whole admin console.
 * Focus:
 *   - Alerts & Incidents
 *   - Moderation Approvals
 *   - Fraud Alerts & KYC Escalations
 *   - AI Approval Requests
 */
export interface AdminMobileShellProps {
  children: ReactNode;
}

export function AdminMobileShell({ children }: AdminMobileShellProps) {
  const tabs = [
    { to: "/admin", label: "Alerts", icon: BellRing },
    { to: "/admin/trust-review", label: "KYC Queue", icon: FileCheck2 },
    { to: "/admin/fraud", label: "Fraud Risks", icon: ShieldAlert },
    { to: "/admin/revenue", label: "Disputes", icon: Flame },
  ];

  return (
    <div className="admin-mobile-shell min-h-screen bg-background text-foreground pb-20 flex flex-col">
      {/* Top Incident Status Header */}
      <header className="sticky top-0 z-40 bg-rose-950/80 backdrop-blur border-b border-rose-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="scale-90" />
          <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-900 text-rose-200 px-2 py-0.5 rounded border border-rose-700">
            Emergency Admin
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span>Live Triage</span>
        </div>
      </header>

      {/* Main Alert / Action Feed */}
      <main className="flex-1 p-3">{children}</main>

      {/* Urgent Action Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border">
        <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium transition ${
                    isActive ? "text-rose-400 font-bold bg-secondary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
