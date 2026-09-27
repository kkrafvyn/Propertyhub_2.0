export type ConsumerDashboardRole = "consumer" | "buyer" | "renter";
export type AgencyDashboardRole = "independent_agent" | "agency_agent" | "agency_manager" | "agency_owner";
export type PropertyOperationsDashboardRole = "property_owner" | "property_manager";
export type PlatformStaffDashboardRole =
  | "developer"
  | "enterprise_operator"
  | "platform_moderator"
  | "platform_manager"
  | "platform_admin";

export type DashboardSummaryCard = {
  label: string;
  href: string;
  icon: "saved" | "offers" | "payments" | "viewings" | "messages" | "leases" | "maintenance" | "pipeline" | "listings" | "team" | "performance" | "operations" | "trust" | "support" | "revenue" | "moderation";
};

export type ConsumerDashboardConfig = {
  kicker: string;
  heading: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  summaryCards: DashboardSummaryCard[];
  quickActions: Array<{ label: string; href: string; icon: string }>;
};

export function normalizeConsumerDashboardRole(role?: string | null): ConsumerDashboardRole {
  if (role === "buyer") return "buyer";
  if (role === "renter") return "renter";
  return "consumer";
}

export function normalizeAgencyDashboardRole(role?: string | null): AgencyDashboardRole {
  if (role === "independent_agent") return "independent_agent";
  if (role === "agency_manager") return "agency_manager";
  if (role === "agency_owner") return "agency_owner";
  return "agency_agent";
}

export function normalizePropertyOperationsDashboardRole(role?: string | null): PropertyOperationsDashboardRole {
  return role === "property_owner" ? "property_owner" : "property_manager";
}

export function normalizePlatformStaffDashboardRole(role?: string | null): PlatformStaffDashboardRole {
  if (role === "developer") return "developer";
  if (role === "enterprise_operator") return "enterprise_operator";
  if (role === "platform_moderator") return "platform_moderator";
  if (role === "platform_manager") return "platform_manager";
  return "platform_admin";
}

export function getConsumerDashboardConfig(role?: string | null): ConsumerDashboardConfig {
  const normalized = normalizeConsumerDashboardRole(role);

  switch (normalized) {
    case "buyer":
      return {
        kicker: "Buying dashboard",
        heading: "Your buying journey",
        description: "Track saved homes, active offers, viewings, and the next milestones in your purchase flow.",
        primaryActionLabel: "Browse homes",
        primaryActionHref: "/search",
        summaryCards: [
          { label: "Saved homes", href: "/app/saved", icon: "saved" },
          { label: "Offers", href: "/app/applications", icon: "offers" },
          { label: "Viewings", href: "/app/viewings", icon: "viewings" },
          { label: "Messages", href: "/app/messages", icon: "messages" },
        ],
        quickActions: [
          { label: "Saved homes", href: "/app/saved", icon: "saved" },
          { label: "Offers & applications", href: "/app/applications", icon: "offers" },
          { label: "Payments", href: "/app/payments", icon: "payments" },
          { label: "Messages", href: "/app/messages", icon: "messages" },
        ],
      };
    case "renter":
      return {
        kicker: "Renter dashboard",
        heading: "Your rental hub",
        description: "Follow upcoming leases, maintenance, payments, and the properties you are actively considering.",
        primaryActionLabel: "Explore rentals",
        primaryActionHref: "/search",
        summaryCards: [
          { label: "Saved rentals", href: "/app/saved", icon: "saved" },
          { label: "Leases", href: "/app/leases", icon: "leases" },
          { label: "Payments", href: "/app/payments", icon: "payments" },
          { label: "Maintenance", href: "/app/maintenance", icon: "maintenance" },
        ],
        quickActions: [
          { label: "Saved rentals", href: "/app/saved", icon: "saved" },
          { label: "Lease status", href: "/app/leases", icon: "leases" },
          { label: "Payments", href: "/app/payments", icon: "payments" },
          { label: "Maintenance", href: "/app/maintenance", icon: "maintenance" },
        ],
      };
    case "consumer":
    default:
      return {
        kicker: "My BaytMiftah",
        heading: "Welcome back",
        description: "Review your homes, applications, payments, and conversations in one place.",
        primaryActionLabel: "Explore properties",
        primaryActionHref: "/search",
        summaryCards: [
          { label: "Saved properties", href: "/app/saved", icon: "saved" },
          { label: "Applications", href: "/app/applications", icon: "offers" },
          { label: "Payments", href: "/app/payments", icon: "payments" },
          { label: "Messages", href: "/app/messages", icon: "messages" },
        ],
        quickActions: [
          { label: "Search homes", href: "/search", icon: "saved" },
          { label: "Saved homes", href: "/app/saved", icon: "saved" },
          { label: "Payments", href: "/app/payments", icon: "payments" },
          { label: "Messages", href: "/app/messages", icon: "messages" },
        ],
      };
  }
}

export function getAgencyDashboardConfig(role?: string | null): ConsumerDashboardConfig {
  const normalized = normalizeAgencyDashboardRole(role);

  switch (normalized) {
    case "independent_agent":
      return {
        kicker: "Independent agent dashboard",
        heading: "Your leads and closings",
        description: "Stay focused on viewings, follow-ups, and the deals that need your attention today.",
        primaryActionLabel: "Open workspace",
        primaryActionHref: "/workspace",
        summaryCards: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Viewings", href: "/workspace", icon: "viewings" },
          { label: "Messages", href: "/workspace", icon: "messages" },
        ],
        quickActions: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Viewings", href: "/workspace", icon: "viewings" },
          { label: "Messages", href: "/workspace", icon: "messages" },
        ],
      };
    case "agency_manager":
      return {
        kicker: "Agency dashboard",
        heading: "Team performance overview",
        description: "Review agent productivity, listings, and operational health for the whole agency.",
        primaryActionLabel: "Open agency workspace",
        primaryActionHref: "/workspace",
        summaryCards: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Team", href: "/workspace", icon: "team" },
          { label: "Performance", href: "/workspace", icon: "performance" },
        ],
        quickActions: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Team", href: "/workspace", icon: "team" },
          { label: "Performance", href: "/workspace", icon: "performance" },
        ],
      };
    case "agency_owner":
      return {
        kicker: "Agency dashboard",
        heading: "Portfolio and branch health",
        description: "Track growth, branch performance, listings, and commercial outcomes across your agency network.",
        primaryActionLabel: "Open portfolio workspace",
        primaryActionHref: "/workspace",
        summaryCards: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Team", href: "/workspace", icon: "team" },
          { label: "Performance", href: "/workspace", icon: "performance" },
        ],
        quickActions: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Team", href: "/workspace", icon: "team" },
          { label: "Performance", href: "/workspace", icon: "performance" },
        ],
      };
    case "agency_agent":
    default:
      return {
        kicker: "Agency dashboard",
        heading: "Your agency dashboard",
        description: "Keep track of leads, listings, pipeline activity, and your next best actions.",
        primaryActionLabel: "Open workspace",
        primaryActionHref: "/workspace",
        summaryCards: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Viewings", href: "/workspace", icon: "viewings" },
          { label: "Messages", href: "/workspace", icon: "messages" },
        ],
        quickActions: [
          { label: "Pipeline", href: "/workspace", icon: "pipeline" },
          { label: "Listings", href: "/workspace", icon: "listings" },
          { label: "Viewings", href: "/workspace", icon: "viewings" },
          { label: "Messages", href: "/workspace", icon: "messages" },
        ],
      };
  }
}

export function getPropertyOperationsDashboardConfig(role?: string | null): ConsumerDashboardConfig {
  const normalized = normalizePropertyOperationsDashboardRole(role);

  if (normalized === "property_owner") {
    return {
      kicker: "Property owner dashboard",
      heading: "Portfolio performance at a glance",
      description: "Track occupancy, income, listings, and the owner decisions that keep your properties performing.",
      primaryActionLabel: "Open property workspace",
      primaryActionHref: "/workspace",
      summaryCards: [
        { label: "Portfolio", href: "/workspace", icon: "listings" },
        { label: "Performance", href: "/workspace", icon: "performance" },
        { label: "Payments", href: "/workspace", icon: "payments" },
        { label: "Documents", href: "/workspace", icon: "leases" },
      ],
      quickActions: [
        { label: "Portfolio", href: "/workspace", icon: "listings" },
        { label: "Performance", href: "/workspace", icon: "performance" },
        { label: "Payments", href: "/workspace", icon: "payments" },
        { label: "Documents", href: "/workspace", icon: "leases" },
      ],
    };
  }

  return {
    kicker: "Property manager dashboard",
    heading: "Keep property operations moving",
    description: "Coordinate leases, maintenance, viewings, and resident follow-up from one operational workspace.",
    primaryActionLabel: "Open operations workspace",
    primaryActionHref: "/workspace",
    summaryCards: [
      { label: "Properties", href: "/workspace", icon: "listings" },
      { label: "Leases", href: "/workspace", icon: "leases" },
      { label: "Maintenance", href: "/workspace", icon: "maintenance" },
      { label: "Viewings", href: "/workspace", icon: "viewings" },
    ],
    quickActions: [
      { label: "Properties", href: "/workspace", icon: "listings" },
      { label: "Leases", href: "/workspace", icon: "leases" },
      { label: "Maintenance", href: "/workspace", icon: "maintenance" },
      { label: "Viewings", href: "/workspace", icon: "viewings" },
    ],
  };
}

export function getPlatformStaffDashboardConfig(role?: string | null): ConsumerDashboardConfig {
  const normalized = normalizePlatformStaffDashboardRole(role);

  const configs: Record<PlatformStaffDashboardRole, ConsumerDashboardConfig> = {
    developer: {
      kicker: "Platform developer dashboard",
      heading: "Keep the platform healthy",
      description: "Monitor application health, release signals, integrations, and the engineering work that keeps BaytMiftah reliable.",
      primaryActionLabel: "Open operations",
      primaryActionHref: "/admin/operations",
      summaryCards: [
        { label: "App health", href: "/admin/operations", icon: "operations" },
        { label: "Organizations", href: "/admin/organizations", icon: "listings" },
        { label: "Integrations", href: "/workspace", icon: "operations" },
        { label: "Support signals", href: "/admin/support", icon: "support" },
      ],
      quickActions: [
        { label: "App health", href: "/admin/operations", icon: "operations" },
        { label: "Support", href: "/admin/support", icon: "support" },
      ],
    },
    enterprise_operator: {
      kicker: "Enterprise operations dashboard",
      heading: "See the platform at operating scale",
      description: "Coordinate organizations, portfolios, service health, and cross-company operational performance.",
      primaryActionLabel: "Open organizations",
      primaryActionHref: "/admin/organizations",
      summaryCards: [
        { label: "Organizations", href: "/admin/organizations", icon: "listings" },
        { label: "App health", href: "/admin/operations", icon: "operations" },
        { label: "Revenue", href: "/admin/revenue", icon: "revenue" },
        { label: "Support", href: "/admin/support", icon: "support" },
      ],
      quickActions: [
        { label: "Organizations", href: "/admin/organizations", icon: "listings" },
        { label: "Revenue", href: "/admin/revenue", icon: "revenue" },
      ],
    },
    platform_moderator: {
      kicker: "Trust and moderation dashboard",
      heading: "Resolve platform risk with context",
      description: "Triage fraud, review trust cases, investigate escalations, and preserve a defensible moderation trail.",
      primaryActionLabel: "Open moderation",
      primaryActionHref: "/admin/moderation",
      summaryCards: [
        { label: "Moderation", href: "/admin/moderation", icon: "moderation" },
        { label: "Fraud radar", href: "/admin/fraud", icon: "trust" },
        { label: "Trust & KYC", href: "/admin/trust", icon: "trust" },
        { label: "Support cases", href: "/admin/support", icon: "support" },
      ],
      quickActions: [
        { label: "Moderation", href: "/admin/moderation", icon: "moderation" },
        { label: "Trust & KYC", href: "/admin/trust", icon: "trust" },
      ],
    },
    platform_manager: {
      kicker: "Platform management dashboard",
      heading: "Run the marketplace with control",
      description: "Balance trust, support, organizations, revenue, and operational performance across the platform.",
      primaryActionLabel: "Open platform overview",
      primaryActionHref: "/admin",
      summaryCards: [
        { label: "Operations", href: "/admin/operations", icon: "operations" },
        { label: "Organizations", href: "/admin/organizations", icon: "listings" },
        { label: "Trust", href: "/admin/trust", icon: "trust" },
        { label: "Revenue", href: "/admin/revenue", icon: "revenue" },
      ],
      quickActions: [
        { label: "Operations", href: "/admin/operations", icon: "operations" },
        { label: "Revenue", href: "/admin/revenue", icon: "revenue" },
      ],
    },
    platform_admin: {
      kicker: "Platform admin dashboard",
      heading: "Command the full BaytMiftah platform",
      description: "Manage platform health, roles, organizations, trust, revenue, and policy from one operational command surface.",
      primaryActionLabel: "Open operations",
      primaryActionHref: "/admin/operations",
      summaryCards: [
        { label: "Operations", href: "/admin/operations", icon: "operations" },
        { label: "Moderation", href: "/admin/moderation", icon: "moderation" },
        { label: "Trust & KYC", href: "/admin/trust", icon: "trust" },
        { label: "Revenue", href: "/admin/revenue", icon: "revenue" },
      ],
      quickActions: [
        { label: "Operations", href: "/admin/operations", icon: "operations" },
        { label: "Assign platform roles", href: "/admin/users", icon: "team" },
      ],
    },
  };

  return configs[normalized];
}
