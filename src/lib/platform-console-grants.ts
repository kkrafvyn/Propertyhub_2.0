export const PLATFORM_CONSOLE_GRANTS = {
  users: "users",
  organizations: "organizations",
  listings: "listings",
  moderation: "moderation",
  trust: "trust",
  support: "support",
  revenue: "revenue",
  settings: "settings",
  integrations: "integrations",
  ai_governance: "ai_governance",
  payments: "payments",
  communications: "communications",
} as const;

export type PlatformConsoleGrant =
  (typeof PLATFORM_CONSOLE_GRANTS)[keyof typeof PLATFORM_CONSOLE_GRANTS];

/** Default bundle for legacy platform managers (no revenue/settings). */
export const PLATFORM_OPERATIONS_GRANTS: PlatformConsoleGrant[] = [
  PLATFORM_CONSOLE_GRANTS.users,
  PLATFORM_CONSOLE_GRANTS.organizations,
  PLATFORM_CONSOLE_GRANTS.listings,
  PLATFORM_CONSOLE_GRANTS.moderation,
  PLATFORM_CONSOLE_GRANTS.trust,
  PLATFORM_CONSOLE_GRANTS.support,
];

export const PLATFORM_CONSOLE_GRANT_ORDER: PlatformConsoleGrant[] = [
  PLATFORM_CONSOLE_GRANTS.users,
  PLATFORM_CONSOLE_GRANTS.organizations,
  PLATFORM_CONSOLE_GRANTS.listings,
  PLATFORM_CONSOLE_GRANTS.moderation,
  PLATFORM_CONSOLE_GRANTS.trust,
  PLATFORM_CONSOLE_GRANTS.support,
  PLATFORM_CONSOLE_GRANTS.integrations,
  PLATFORM_CONSOLE_GRANTS.ai_governance,
  PLATFORM_CONSOLE_GRANTS.payments,
  PLATFORM_CONSOLE_GRANTS.communications,
  PLATFORM_CONSOLE_GRANTS.revenue,
  PLATFORM_CONSOLE_GRANTS.settings,
];

export const PLATFORM_CONSOLE_GRANT_LABELS: Record<PlatformConsoleGrant, string> = {
  users: "User management",
  organizations: "Organizations",
  listings: "Listings",
  moderation: "Moderation",
  trust: "Trust & KYC",
  support: "Support",
  revenue: "Revenue",
  settings: "Settings",
  integrations: "Integrations & jobs",
  ai_governance: "Platform AI",
  payments: "Payments ledger",
  communications: "Communications",
};

export const PLATFORM_CONSOLE_GRANT_DESCRIPTIONS: Record<PlatformConsoleGrant, string> = {
  users: "Verify, ban, and review the user directory.",
  organizations: "Approve or suspend workspace teams.",
  listings: "Moderate listing visibility and featured status.",
  moderation: "Triage fraud alerts and review cases.",
  trust: "Review KYC submissions and trust requests.",
  support: "Handle support lookups and escalations.",
  revenue: "Configure platform fees and revenue rules.",
  settings: "Manage platform-wide settings, backups, and role grants.",
  integrations: "View platform health, integration status, and background job queues.",
  ai_governance: "Review cross-organization AI action logs and governance signals.",
  payments: "View platform-wide payment transactions and checkout activity.",
  communications: "Monitor delivery attempts and communication escalations.",
};

export type PlatformRolePresetId =
  | "custom"
  | "moderator"
  | "trust_reviewer"
  | "user_support"
  | "operations";

export const PLATFORM_ROLE_PRESETS: Record<
  PlatformRolePresetId,
  { label: string; grants: PlatformConsoleGrant[] }
> = {
  custom: { label: "Custom", grants: [] },
  moderator: {
    label: "Moderator",
    grants: [PLATFORM_CONSOLE_GRANTS.listings, PLATFORM_CONSOLE_GRANTS.moderation],
  },
  trust_reviewer: {
    label: "Trust reviewer",
    grants: [PLATFORM_CONSOLE_GRANTS.trust],
  },
  user_support: {
    label: "User support",
    grants: [PLATFORM_CONSOLE_GRANTS.users, PLATFORM_CONSOLE_GRANTS.support],
  },
  operations: {
    label: "Operations manager",
    grants: [
      ...PLATFORM_OPERATIONS_GRANTS,
      PLATFORM_CONSOLE_GRANTS.integrations,
      PLATFORM_CONSOLE_GRANTS.ai_governance,
      PLATFORM_CONSOLE_GRANTS.payments,
      PLATFORM_CONSOLE_GRANTS.communications,
    ],
  },
};

const GRANT_SET = new Set<string>(Object.values(PLATFORM_CONSOLE_GRANTS));

export function isPlatformConsoleGrant(value: string): value is PlatformConsoleGrant {
  return GRANT_SET.has(value);
}

export function normalizePlatformGrants(
  grants: readonly string[] | null | undefined,
): PlatformConsoleGrant[] {
  const normalized: PlatformConsoleGrant[] = [];
  for (const grant of grants ?? []) {
    if (isPlatformConsoleGrant(grant) && !normalized.includes(grant)) {
      normalized.push(grant);
    }
  }
  return normalized;
}

export function grantsEqual(a: PlatformConsoleGrant[], b: PlatformConsoleGrant[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((grant) => setB.has(grant));
}

export function detectPlatformRolePreset(grants: PlatformConsoleGrant[]): PlatformRolePresetId {
  for (const [id, preset] of Object.entries(PLATFORM_ROLE_PRESETS) as Array<
    [PlatformRolePresetId, (typeof PLATFORM_ROLE_PRESETS)[PlatformRolePresetId]]
  >) {
    if (id === "custom") continue;
    if (grantsEqual(grants, preset.grants)) return id;
  }
  return "custom";
}

export function formatPlatformGrantSummary(grants: PlatformConsoleGrant[]) {
  if (grants.length === 0) return "No platform roles";
  return grants.map((grant) => PLATFORM_CONSOLE_GRANT_LABELS[grant]).join(", ");
}
