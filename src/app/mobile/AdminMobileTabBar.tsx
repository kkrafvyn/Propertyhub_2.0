import { NavLink, useLocation } from "react-router";
import { useTranslation } from "../i18n/LocaleContext";
import { ADMIN_MOBILE_TABS } from "../lib/admin-mobile-nav";

export function AdminMobileTabBar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-xl"
      aria-label={t("adminMobile.primaryNav")}
    >
      <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ADMIN_MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                isActive
                  ? "bg-secondary font-bold text-rose-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-[4.5rem] truncate">{t(tab.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
