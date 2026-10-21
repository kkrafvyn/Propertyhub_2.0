import { useMemo, type ReactNode } from "react";
import {
  CONSUMER_PRIMARY_NAV,
  CONSUMER_SECONDARY_NAV,
} from "../../lib/consumer-page-config";
import {
  ConsumerPortalNav,
  type ConsumerNavItem,
} from "../baytmiftah/consumer/ConsumerPortalNav";

/** Portal nav pills for standalone `/app/*` routes outside UserDashboard. */
export function ConsumerHubChrome({
  activeSection,
  children,
}: {
  activeSection: string;
  children: ReactNode;
}) {
  const items = useMemo(() => {
    const merged: ConsumerNavItem[] = [];
    const seen = new Set<string>();
    for (const item of [...CONSUMER_PRIMARY_NAV, ...CONSUMER_SECONDARY_NAV]) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      merged.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        section: item.section,
        badgeCount: null,
      });
    }
    return merged;
  }, []);

  return (
    <div className="space-y-6">
      <ConsumerPortalNav items={items} activeSection={activeSection} />
      {children}
    </div>
  );
}
