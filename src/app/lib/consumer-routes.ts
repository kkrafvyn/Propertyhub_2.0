/** Canonical consumer-facing routes for Propertyhub (not phub legacy paths). */

export const CONSUMER_ROUTES = {
  home: "/",
  search: "/search",
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
  "/consumer/rent": CONSUMER_ROUTES.search + "?listingType=rental",
  "/consumer/lease": CONSUMER_ROUTES.search + "?listingType=lease",
  "/consumer/stay": CONSUMER_ROUTES.search + "?listingType=short_stay",
  "/consumer/invest": CONSUMER_ROUTES.profile,
};
