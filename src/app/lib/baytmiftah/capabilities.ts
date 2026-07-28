import { isWorkspaceRole } from "./roles";

export const CAPABILITIES = {
  BUY: "buy",
  RENT: "rent",
  LEASE: "lease",
  STAY_GUEST: "stay_guest",
  STAY_HOST: "stay_host",
} as const;

export type ConsumerContextSnapshot = {
  hasBookingContext: boolean;
  hasRentingContext: boolean;
  hasBuyingContext: boolean;
};

export function hasCapability(capabilities: string[] = [], cap: string) {
  return capabilities.includes(cap);
}

/** Derive unlocked consumer capabilities from live account context and app role. */
export function deriveConsumerCapabilities(
  context: Pick<
    ConsumerContextSnapshot,
    "hasBookingContext" | "hasRentingContext" | "hasBuyingContext"
  > | null,
  appRole?: string | null,
): string[] {
  const caps = new Set<string>([
    CAPABILITIES.BUY,
    CAPABILITIES.RENT,
    CAPABILITIES.LEASE,
    CAPABILITIES.STAY_GUEST,
  ]);

  if (isWorkspaceRole(appRole) || appRole === "host" || appRole === "agent") {
    caps.add(CAPABILITIES.STAY_HOST);
  }

  if (!context) {
    return Array.from(caps);
  }

  if (context.hasRentingContext) {
    caps.add("smart_resident");
  }

  if (context.hasBookingContext) {
    caps.add(CAPABILITIES.STAY_GUEST);
  }

  if (context.hasBuyingContext) {
    caps.add(CAPABILITIES.BUY);
  }

  return Array.from(caps);
}
