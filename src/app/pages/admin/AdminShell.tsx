import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { canAccessAdminSection, platformRoleLabel } from "../../../lib/platform-access";
import { ADMIN_NAV_ITEMS, adminSectionFromPath } from "./admin-nav-config";
import { shouldUseAdminMobileShell } from "../../lib/admin-mobile-nav";
import { AdminMobileShell } from "../../shells/AdminMobileShell";
import { isElectron } from "../../../lib/surface-detection";

export function AdminShell() {
  const location = useLocation();
  const { profile } = useAuth();
  const currentSection = useMemo(() => adminSectionFromPath(location.pathname), [location.pathname]);

  const visibleNavItems = useMemo(
    () =>
      ADMIN_NAV_ITEMS.filter((item) => {
        if (item.ownerOnly && !profile?.is_platform_admin) return false;
        return canAccessAdminSection(profile, item.key);
      }),
    [profile],
  );

  const main = (
    <main className={isElectron() || shouldUseAdminMobileShell() ? "space-y-4" : "flex-1 p-8 bg-secondary/30"}>
      <div className={isElectron() || shouldUseAdminMobileShell() ? "" : "max-w-7xl"}>
        <Outlet />
      </div>
    </main>
  );

  if (shouldUseAdminMobileShell()) {
    return (
      <AdminMobileShell>
        <div className="admin-legacy-ui">{main}</div>
      </AdminMobileShell>
    );
  }

  if (isElectron()) {
    return <div className="max-w-7xl mx-auto admin-legacy-ui">{main}</div>;
  }

  return (
    <div className="admin-legacy-ui min-h-screen bg-background">
      <nav className="bg-gradient-to-r from-primary to-accent text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-semibold block">Admin Console</span>
                <span className="text-xs text-white/80">BaytMiftah REOS</span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20">{platformRoleLabel(profile)}</Badge>
              <Link to="/">
                <Button variant="secondary" size="sm">
                  Back to Site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 border-r border-border bg-card min-h-[calc(100vh-73px)] p-6">
          <nav className="space-y-2">
            {visibleNavItems.map((item) => {
              const isActive =
                currentSection === item.key ||
                (item.key === "overview" && location.pathname === "/admin");
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-primary text-white" : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        {main}
      </div>
    </div>
  );
}
