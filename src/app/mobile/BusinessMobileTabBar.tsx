import { NavLink } from "react-router";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "../i18n/LocaleContext";

export type BusinessMobileTabItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
};

export function BusinessMobileTabBar({ tabs }: { tabs: BusinessMobileTabItem[] }) {
  const { t } = useTranslation();

  if (tabs.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-xl"
      aria-label={t("mobileShell.primaryNav")}
    >
      <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to.split("/").length <= 3}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                  isActive
                    ? "bg-secondary font-bold text-emerald-500 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
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
