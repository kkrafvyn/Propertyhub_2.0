export type UserDashboardSection =
  | "overview"
  | "compare"
  | "buying-tools"
  | "deals"
  | "verification"
  | "insights"
  | "concierge"
  | "groups"
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
  { section: "verification", href: "/app/verification", label: "Verification" },
  { section: "insights", href: "/app/insights", label: "Insights" },
  { section: "concierge", href: "/app/concierge", label: "Concierge" },
  { section: "groups", href: "/app/groups", label: "Buying Group" },
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

const MINIMAL_USER_DASHBOARD_SECTIONS: UserDashboardSection[] = [
  "overview",
  "saved",
  "messages",
  "viewings",
  "deals",
  "payments",
  "settings",
];

export function getMinimalUserDashboardRoutes() {
  return MINIMAL_USER_DASHBOARD_SECTIONS.map((section) =>
    USER_DASHBOARD_ROUTE_CONFIG.find((route) => route.section === section)
  ).filter(Boolean) as UserDashboardRouteConfig[];
}

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
  | "seller-portal"
  | "crm"
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
  { slug: "seller-portal", label: "Seller Portal" },
  { slug: "crm", label: "Agent CRM" },
  { slug: "referrals", label: "Referrals" },
  { slug: "aftercare", label: "Aftercare" },
];

export function getWorkspaceGrowthSection(
  page?: string | null
): WorkspaceGrowthSection | null {
  const matchedRoute = WORKSPACE_GROWTH_ROUTE_CONFIG.find((item) => item.slug === page);
  return matchedRoute?.slug || null;
}
