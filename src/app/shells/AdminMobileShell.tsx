import { type ReactNode } from "react";
import { Logo } from "../components/baytmiftah/Logo";
import { useTranslation } from "../i18n/LocaleContext";
import { AdminMobileTabBar } from "../mobile/AdminMobileTabBar";

export interface AdminMobileShellProps {
  children: ReactNode;
}

export function AdminMobileShell({ children }: AdminMobileShellProps) {
  const { t } = useTranslation();

  return (
    <div
      className="admin-mobile-shell flex min-h-[100dvh] flex-col bg-background text-foreground"
      style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rose-900 bg-rose-950/80 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Logo className="scale-90" showText={false} inverted />
          <span className="rounded border border-rose-700 bg-rose-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200">
            {t("adminMobile.badge")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-rose-300">
          <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />
          <span>{t("adminMobile.liveTriage")}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3">{children}</main>

      <AdminMobileTabBar />
    </div>
  );
}
