/** Canonical consumer-facing routes for Propertyhub (not phub legacy paths). */

import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";

export const CONSUMER_ROUTES = {
  home: "/",
  search: "/search",
  compare: "/compare",
  saved: "/app/saved",
  messages: "/app/messages",
  profile: "/app",
  settings: "/app/settings",
  trips: "/app/trips",
  reservations: "/app/reservations",
  applications: "/app/applications",
  viewings: "/app/viewings",
  payments: "/app/payments",
  wallet: "/app/wallet",
  leases: "/app/leases",
  maintenance: "/app/maintenance",
  documents: "/app/documents",
  transactions: "/app/transactions",
  notifications: "/app/notifications",
  mortgage: "/app/mortgage",
  login: "/login",
  workspace: "/workspace",
  kyc: "/app/settings",
} as const;

export function propertyPath(id: string) {
  return `/property/${id}`;
}

export function messageThreadPath(conversationId: string) {
  return `/app/messages?conversation=${encodeURIComponent(conversationId)}`;
}

export function exploreModeUrl(listingType: string) {
  switch (listingType) {
    case "shortStay":
      return "/search?listingType=short_stay";
    case "buy":
      return "/search?listingType=sale";
    case "rent":
      return "/search?listingType=rental";
    case "lease":
      return "/search?listingType=lease";
    default:
      return CONSUMER_ROUTES.search;
  }
}

/** Map phub-style paths to Propertyhub routes (for redirects / menu normalization). */
export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/explore": CONSUMER_ROUTES.search,
  "/saved": CONSUMER_ROUTES.saved,
  "/messages": CONSUMER_ROUTES.messages,
  "/profile": CONSUMER_ROUTES.profile,
  "/trips": CONSUMER_ROUTES.trips,
  "/wallet": CONSUMER_ROUTES.wallet,
  "/profile/kyc": CONSUMER_ROUTES.kyc,
  "/offers": CONSUMER_ROUTES.applications,
  "/transactions": CONSUMER_ROUTES.transactions,
  "/documents": CONSUMER_ROUTES.documents,
  "/consumer": CONSUMER_ROUTES.profile,
  "/consumer/buy": CONSUMER_ROUTES.applications,
  "/consumer/rent": `${CONSUMER_ROUTES.search}?listingType=rental`,
  "/consumer/lease": `${CONSUMER_ROUTES.search}?listingType=lease`,
  "/consumer/stay": `${CONSUMER_ROUTES.search}?listingType=short_stay`,
  "/consumer/invest": CONSUMER_ROUTES.profile,
  "/neighborhoods": CONSUMER_ROUTES.search,
  "/agencies": CONSUMER_ROUTES.search,
  "/agents": CONSUMER_ROUTES.search,
  "/services": CONSUMER_ROUTES.search,
  "/help": CONSUMER_ROUTES.profile,
  "/tenant": CONSUMER_ROUTES.profile,
  "/my-home": CONSUMER_ROUTES.profile,
  "/resident": CONSUMER_ROUTES.profile,
  "/host": `${WORKSPACE_ENTRY_PATH}?next=host`,
  "/buyer/finance": CONSUMER_ROUTES.mortgage,
  "/buyer/advisor": CONSUMER_ROUTES.profile,
  "/renter/leases": CONSUMER_ROUTES.leases,
  "/renter/payments": CONSUMER_ROUTES.payments,
  "/renter/maintenance": CONSUMER_ROUTES.maintenance,
  "/renter/apply": CONSUMER_ROUTES.applications,
  "/renter/sign": CONSUMER_ROUTES.documents,
  "/renter/renewal": CONSUMER_ROUTES.leases,
  "/renter/credit": CONSUMER_ROUTES.profile,
  "/renter/utilities": CONSUMER_ROUTES.payments,
};

/** Prefix redirects for phub route trees not in Propertyhub router. */
export const LEGACY_PREFIX_REDIRECTS: Array<{ prefix: string; target: string }> = [
  { prefix: "/investment", target: CONSUMER_ROUTES.profile },
  { prefix: "/finance", target: `${WORKSPACE_ENTRY_PATH}?next=finance` },
  { prefix: "/intelligence", target: `${WORKSPACE_ENTRY_PATH}?next=market-intelligence` },
  { prefix: "/agent", target: WORKSPACE_ENTRY_PATH },
  { prefix: "/agency", target: WORKSPACE_ENTRY_PATH },
  { prefix: "/manage", target: WORKSPACE_ENTRY_PATH },
  { prefix: "/developer", target: `${WORKSPACE_ENTRY_PATH}?next=integrations` },
  { prefix: "/enterprise", target: `${WORKSPACE_ENTRY_PATH}?next=org-insights` },
  { prefix: "/smart", target: `${WORKSPACE_ENTRY_PATH}?next=host` },
  { prefix: "/vendors", target: `${WORKSPACE_ENTRY_PATH}?next=vendors` },
  { prefix: "/renter", target: CONSUMER_ROUTES.leases },
  { prefix: "/buyer", target: CONSUMER_ROUTES.applications },
  { prefix: "/consumer", target: CONSUMER_ROUTES.profile },
];

export function resolveLegacyRedirect(pathname: string): string {
  const exact = LEGACY_ROUTE_REDIRECTS[pathname];
  if (exact) return exact;

  for (const { prefix, target } of LEGACY_PREFIX_REDIRECTS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return target;
    }
  }

  return CONSUMER_ROUTES.home;
}
