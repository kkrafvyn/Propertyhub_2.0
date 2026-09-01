import React, { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  ShieldAlert,
  Server,
  Cpu,
  Sliders,
  Terminal,
  Database,
  Radio,
  BarChart2,
  FileCheck2,
  AlertOctagon,
} from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";
import { ThemeToggle } from "../components/baytmiftah/ThemeToggle";
import { UserMenu } from "../components/baytmiftah/UserMenu";

/**
 * Surface 7: Admin Desktop Shell
 * ──────────────────────────────
 * Heavy platform-control environment:
 * Advanced fraud investigation, trust operations, platform telemetry,
 * bulk moderation queues, system health, AI agent oversight, and provider monitoring.
 */
export interface AdminDesktopShellProps {
  children: ReactNode;
}

export function AdminDesktopShell({ children }: AdminDesktopShellProps) {
  const location = useLocation();

  const opsModules = [
    { to: "/admin", label: "Control Center", icon: Radio, badge: "LIVE" },
    { to: "/admin/trust-review", label: "Trust & KYC Queues", icon: FileCheck2, badge: "SEC" },
    { to: "/admin/fraud", label: "Fraud Radar & Inquiries", icon: ShieldAlert, badge: "RISK" },
    { to: "/admin/revenue", label: "Fee Resolution & Settlement", icon: BarChart2, badge: "PAY" },
  ];

  return (
    <div className="admin-desktop-shell flex flex-col h-screen overflow-hidden bg-background text-foreground select-none">
      {/* Admin Title Bar */}
      <header className="h-10 bg-rose-950/40 border-b border-rose-900/50 flex items-center justify-between px-3 shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <Logo className="scale-90" />
          <span className="font-semibold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/80 tracking-wide font-mono">
            BAYTMIFTAH PLATFORM OPS [DESKTOP]
          </span>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
          <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Healthy
          </span>
          <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Pay Angels Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Main Grid with Investigation Rails */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Ops Nav Rail */}
        <aside className="w-60 bg-card border-r border-border p-3 space-y-1 overflow-y-auto shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
            Platform Command
          </div>
          {opsModules.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  active
                    ? "bg-rose-950 text-rose-300 border border-rose-800 shadow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </aside>

        {/* Workspace Body */}
        <main className="flex-1 overflow-y-auto bg-background p-4">{children}</main>
      </div>
    </div>
  );
}
