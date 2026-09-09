import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";
import { ThemeToggle } from "../components/baytmiftah/ThemeToggle";
import { UserMenu } from "../components/baytmiftah/UserMenu";
import {
  DESKTOP_WORKSPACES,
  getDesktopWorkspace,
  getDesktopWorkspaceForPage,
  type DesktopWorkspaceId,
} from "../lib/desktop-workspaces";
import { getWorkspaceRoute } from "../../lib/workspace";

export interface BusinessDesktopShellProps {
  children: ReactNode;
  organizationName?: string;
}

export function BusinessDesktopShell({ children, organizationName }: BusinessDesktopShellProps) {
  const { organizationSlug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [version, setVersion] = useState("2.0.0");

  const currentPage = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const slugIndex = parts.indexOf(organizationSlug);
    if (slugIndex >= 0 && parts[slugIndex + 1]) {
      return parts[slugIndex + 1];
    }
    return "";
  }, [location.pathname, organizationSlug]);

  const activeWorkspaceId = getDesktopWorkspaceForPage(currentPage);
  const [expandedId, setExpandedId] = useState<DesktopWorkspaceId>(activeWorkspaceId);

  useEffect(() => {
    setExpandedId(activeWorkspaceId);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (window.desktopAPI?.getAppVersion) {
      window.desktopAPI.getAppVersion().then(setVersion).catch(() => {});
    }
  }, []);

  const workspaceBase = getWorkspaceRoute(organizationSlug);

  const toggleWorkspace = (id: DesktopWorkspaceId) => {
    setExpandedId((prev) => (prev === id ? prev : id));
    const workspace = getDesktopWorkspace(id);
    navigate(getWorkspaceRoute(organizationSlug, workspace.landingSlug));
  };

  return (
    <div className="business-desktop-shell flex flex-col h-screen overflow-hidden bg-background text-foreground select-none">
      <header className="h-10 bg-card border-b border-border flex items-center justify-between px-3 shrink-0 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Logo className="scale-90" variant="workspace" to={workspaceBase} showText />
          <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20 dark:border-emerald-800/60 shrink-0 text-[10px] tracking-wide">
            REOS WORKSTATION v{version}
          </span>
          <span className="text-muted-foreground font-mono text-[11px] truncate">
            {organizationName || organizationSlug}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(getWorkspaceRoute(organizationSlug, "ai-assistant"))}
          className="flex items-center gap-2 px-3 py-1 bg-surface-subtle hover:bg-surface-hover text-ink rounded-lg text-xs border border-surface-border transition-all shadow-xs cursor-pointer group"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
          <span className="font-medium">Command</span>
          <kbd className="px-1.5 py-0.5 bg-surface text-ink-muted text-[10px] rounded border border-surface-border font-mono">
            Ctrl+K
          </kbd>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-card border-r border-border flex flex-col shrink-0">
          <div className="p-3 space-y-1 overflow-y-auto flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">
              Professional Workspaces
            </p>

            {DESKTOP_WORKSPACES.map((workspace) => {
              const Icon = workspace.icon;
              const isExpanded = expandedId === workspace.id;
              const isActive = activeWorkspaceId === workspace.id;

              return (
                <div key={workspace.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleWorkspace(workspace.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{workspace.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    )}
                  </button>

                  {isExpanded ? (
                    <div className="ml-3 pl-3 border-l border-border/60 space-y-0.5 pb-1">
                      {workspace.modules.map((mod) => {
                        const modPath = getWorkspaceRoute(organizationSlug, mod.slug);
                        const modActive =
                          currentPage === mod.slug ||
                          (mod.slug === "my-work" && currentPage === "");
                        return (
                          <Link
                            key={mod.slug}
                            to={modPath}
                            className={`block px-3 py-1.5 rounded-md text-[11px] transition truncate ${
                              modActive
                                ? "bg-secondary text-emerald-600 dark:text-emerald-400 font-medium"
                                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                            }`}
                          >
                            {mod.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-border text-[11px] text-muted-foreground bg-background/60">
            <p className="font-mono text-[10px] leading-relaxed">
              Desktop = manage · Mobile = act
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
