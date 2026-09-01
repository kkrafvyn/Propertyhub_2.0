import React, { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  Building2,
  Calculator,
  Layers,
  ShoppingBag,
  Cpu,
  Workflow,
  Download,
  Upload,
  BarChart4,
  Settings,
  Bell,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
  Search,
  BookOpen,
} from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";
import { ThemeToggle } from "../components/baytmiftah/ThemeToggle";
import { UserMenu } from "../components/baytmiftah/UserMenu";
import { useAuth } from "../context/AuthContext";

/**
 * Surface 4: Business Desktop Shell
 * ─────────────────────────────────
 * The heavy-duty enterprise operating environment.
 * Houses: General Ledger, Chart of Accounts, Procurement, Bank Reconciliation,
 * Portfolio Analytics, AI Command Center, Automation Builder, Bulk Operations,
 * and high-throughput Data Import/Export.
 */
export interface BusinessDesktopShellProps {
  children: ReactNode;
}

export function BusinessDesktopShell({ children }: BusinessDesktopShellProps) {
  const { organizationSlug = "default" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [version, setVersion] = useState<string>("2.0.0");

  useEffect(() => {
    // Check if desktop API is available
    const api = (window as unknown as { desktopAPI?: { getVersion?: () => Promise<string> } }).desktopAPI;
    if (api?.getVersion) {
      api.getVersion().then(setVersion).catch(() => {});
    }
  }, []);

  const desktopModules = [
    {
      id: "general-ledger",
      name: "General Ledger & COA",
      icon: Calculator,
      path: `/workspace/${organizationSlug}/general-ledger`,
      badge: "Desktop Pro",
    },
    {
      id: "procurement",
      name: "Procurement & POs",
      icon: ShoppingBag,
      path: `/workspace/${organizationSlug}/procurement`,
      badge: "ERP",
    },
    {
      id: "portfolio-analytics",
      name: "Portfolio & Multi-Entity P&L",
      icon: BarChart4,
      path: `/workspace/${organizationSlug}/portfolio-analytics`,
      badge: "Analytics",
    },
    {
      id: "ai-command-center",
      name: "AI Command & Night Watch",
      icon: Cpu,
      path: `/workspace/${organizationSlug}/ai-command-center`,
      badge: "Agentic AI",
    },
    {
      id: "automation-builder",
      name: "Visual Automation Engine",
      icon: Workflow,
      path: `/workspace/${organizationSlug}/automation-builder`,
      badge: "Automation",
    },
    {
      id: "bulk-operations",
      name: "Bulk Ops & Mass Billing",
      icon: Layers,
      path: `/workspace/${organizationSlug}/bulk-operations`,
      badge: "Batch",
    },
    {
      id: "data-import-export",
      name: "Data IO & Mappings",
      icon: Download,
      path: `/workspace/${organizationSlug}/data-import-export`,
      badge: "ETL",
    },
  ];

  return (
    <div className="business-desktop-shell flex flex-col h-screen overflow-hidden bg-background text-foreground select-none">
      {/* Native Desktop Window Title Bar */}
      <header className="h-10 bg-card border-b border-border flex items-center justify-between px-3 shrink-0 text-xs">
        <div className="flex items-center gap-3">
          <Logo className="scale-90" />
          <span className="font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            REOS DESKTOP PRO v{version}
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            Org: <strong className="text-foreground">{organizationSlug}</strong>
          </span>
        </div>

        {/* Global Desktop Search Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/workspace/${organizationSlug}/ai-assistant`)}
            className="flex items-center gap-2 px-3 py-1 bg-secondary hover:bg-secondary/70 text-foreground rounded text-xs border border-border transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>AI Copilot Command</span>
            <kbd className="px-1.5 py-0.2 bg-background text-muted-foreground text-[10px] rounded border border-border">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* User & Window Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Main Workspace Layout with Desktop Module Rail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Heavy ERP Module Rail */}
        <aside className="w-64 bg-card border-r border-border flex flex-col justify-between shrink-0">
          <div className="p-3 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">
              Enterprise Workspaces
            </div>
            <Link
              to={`/workspace/${organizationSlug}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                location.pathname === `/workspace/${organizationSlug}`
                  ? "bg-emerald-600 text-white font-semibold shadow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Workspace Dashboard</span>
            </Link>

            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 px-3 pt-4 pb-1">
              Heavy-Duty Desktop ERP
            </div>

            {desktopModules.map((mod) => {
              const Icon = mod.icon;
              const isActive = location.pathname.includes(mod.id);
              return (
                <Link
                  key={mod.id}
                  to={mod.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition group ${
                    isActive
                      ? "bg-secondary text-emerald-500 dark:text-emerald-400 border border-emerald-500/40 shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="truncate">{mod.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-mono shrink-0">
                    {mod.badge}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Status Footer */}
          <div className="p-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between bg-background/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Electron Sync Active</span>
            </span>
            <span className="font-mono">60 FPS</span>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
