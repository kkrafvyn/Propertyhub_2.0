import { Link, useLocation } from "react-router";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  PlusCircle,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LocaleContext";
import { isWorkspaceRole } from "../lib/baytmiftah/roles";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import "./mobile.css";

const WORKSPACE_SHORTCUTS = [
  {
    id: "dashboard",
    labelKey: "mobile.workspace.dashboard",
    href: WORKSPACE_ENTRY_PATH,
    icon: LayoutDashboard,
  },
  {
    id: "list",
    labelKey: "mobile.workspace.listProperty",
    href: `${WORKSPACE_ENTRY_PATH}?next=new`,
    icon: PlusCircle,
  },
  {
    id: "leads",
    labelKey: "mobile.workspace.leads",
    href: `${WORKSPACE_ENTRY_PATH}?next=leads`,
    icon: Users,
  },
  {
    id: "calendar",
    labelKey: "mobile.workspace.calendar",
    href: `${WORKSPACE_ENTRY_PATH}?next=calendar`,
    icon: CalendarDays,
  },
  {
    id: "listings",
    labelKey: "mobile.workspace.listings",
    href: `${WORKSPACE_ENTRY_PATH}?next=listings`,
    icon: Building2,
  },
] as const;

export function MobileWorkspaceDock() {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (!user || !isWorkspaceRole(role)) return null;
  if (location.pathname.startsWith("/workspace") || location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="mobile-workspace-dock" aria-label={t("mobile.workspace.dockLabel")}>
      <p className="mobile-workspace-dock-title">{t("mobile.workspace.dockTitle")}</p>
      <div className="mobile-workspace-dock-scroll">
        {WORKSPACE_SHORTCUTS.map(({ id, labelKey, href, icon: Icon }) => (
          <Link key={id} to={href} className="mobile-workspace-dock-item">
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
