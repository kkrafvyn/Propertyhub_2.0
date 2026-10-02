import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { type ReactNode } from "react";
import { Link } from "react-router";
import { Menu } from "lucide-react";
import { Logo } from "../components/baytmiftah/Logo";
import { useTranslation } from "../i18n/LocaleContext";
import {
  getBusinessMobileTabs,
  type BusinessMobileJobRole,
} from "../lib/business-mobile-nav";
import type { MemberRole } from "../../lib/workspace";
import { BusinessMobileTabBar } from "../mobile/BusinessMobileTabBar";

export interface BusinessMobileShellProps {
  children: ReactNode;
  jobRole?: BusinessMobileJobRole;
  organizationSlug?: string;
  organizationName?: string;
  organizationId?: string;
  memberRole?: MemberRole | null;
  organizationOptions?: Array<{ id: string; slug: string; name: string }>;
  onOrganizationChange?: (organizationId: string) => void;
  showNav?: boolean;
  onMenuPress?: () => void;
}

export function BusinessMobileShell({
  children,
  jobRole = "property_manager",
  organizationSlug = "",
  organizationName,
  organizationId,
  memberRole = null,
  organizationOptions = [],
  onOrganizationChange,
  showNav = true,
  onMenuPress,
}: BusinessMobileShellProps) {
  const { t } = useTranslation();
  const tabs = showNav && organizationSlug
    ? getBusinessMobileTabs(jobRole, organizationSlug, memberRole)
    : [];
  const roleLabel = t(`mobileShell.jobRoles.${jobRole}`);
  const logoTo = organizationSlug ? `/workspace/${organizationSlug}` : "/workspace";

  return (
    <div
      className="business-mobile-shell flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <header className="relative z-40 shrink-0 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          {onMenuPress ? (
            <button
              type="button"
              onClick={onMenuPress}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle text-foreground"
              aria-label={t("mobileShell.openMenu")}
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}
          <Logo to={logoTo} className="scale-90" showText={false} />
          <div className="min-w-0">
            <span className="inline-flex rounded border border-emerald-800/80 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {roleLabel}
            </span>
            {organizationName ? (
              <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{organizationName}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {organizationOptions.length > 1 && onOrganizationChange && organizationId ? (
            <NativeSelectControl
              className="max-w-[7rem] rounded-lg border border-border bg-surface px-2 py-1 text-[10px] text-foreground outline-none focus:border-primary"
              value={organizationId}
              onChange={(event) => onOrganizationChange(event.target.value)}
              aria-label={t("mobileShell.switchOrg")}
            >
              {organizationOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </NativeSelectControl>
          ) : organizationSlug ? (
            <Link
              to={`/workspace/${organizationSlug}/settings`}
              className="text-[10px] font-mono text-muted-foreground"
            >
              {t("mobileShell.orgShort", { slug: organizationSlug })}
            </Link>
          ) : null}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="main-content-region flex-1 min-h-0 overflow-y-auto p-3">{children}</main>

      {tabs.length > 0 ? <BusinessMobileTabBar tabs={tabs} /> : null}
    </div>
  );
}
