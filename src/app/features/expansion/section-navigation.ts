export type UserDashboardSection =
  | "overview"
  | "compare"
  | "buying-tools"
  | "deals"
  | "referrals"
  | "support"
  | "saved"
  | "messages"
  | "applications"
  | "viewings"
  | "alerts"
  | "payments"
  | "settings";

export interface UserDashboardRouteConfig {
  section: UserDashboardSection;
  href: string;
  label: string;
}

export const USER_DASHBOARD_ROUTE_CONFIG: UserDashboardRouteConfig[] = [
  { section: "overview", href: "/app", label: "Overview" },
  { section: "compare", href: "/app/compare", label: "Compare" },
  { section: "buying-tools", href: "/app/buying-tools", label: "Buyer Tools" },
  { section: "deals", href: "/app/deals", label: "Deal Rooms" },
  { section: "referrals", href: "/app/referrals", label: "Referrals" },
  { section: "support", href: "/app/support", label: "Support" },
  { section: "saved", href: "/app/saved", label: "Saved" },
  { section: "messages", href: "/app/messages", label: "Messages" },
  { section: "applications", href: "/app/applications", label: "Applications" },
  { section: "viewings", href: "/app/viewings", label: "Viewings" },
  { section: "alerts", href: "/app/alerts", label: "Alerts" },
  { section: "payments", href: "/app/payments", label: "Payments" },
  { section: "settings", href: "/app/settings", label: "Settings" },
];

export function getUserDashboardSection(pathname: string): UserDashboardSection {
  const matchedRoute = USER_DASHBOARD_ROUTE_CONFIG.find(
    (item) => item.section !== "overview" && pathname.startsWith(item.href)
  );

  return matchedRoute?.section || "overview";
}

export type WorkspaceGrowthSection =
  | "offers"
  | "deal-rooms"
  | "performance"
  | "referrals"
  | "aftercare";

export interface WorkspaceGrowthRouteConfig {
  slug: WorkspaceGrowthSection;
  label: string;
}

export const WORKSPACE_GROWTH_ROUTE_CONFIG: WorkspaceGrowthRouteConfig[] = [
  { slug: "offers", label: "Offers" },
  { slug: "deal-rooms", label: "Deal Rooms" },
  { slug: "performance", label: "Performance" },
  { slug: "referrals", label: "Referrals" },
  { slug: "aftercare", label: "Aftercare" },
];

export function getWorkspaceGrowthSection(
  page?: string | null
): WorkspaceGrowthSection | null {
  const matchedRoute = WORKSPACE_GROWTH_ROUTE_CONFIG.find((item) => item.slug === page);
  return matchedRoute?.slug || null;
}
