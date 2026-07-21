export const CAPABILITIES = {
  BUY: "buy",
  RENT: "rent",
  LEASE: "lease",
  STAY_GUEST: "stay_guest",
  STAY_HOST: "stay_host",
  INVEST: "invest",
} as const;

export function hasCapability(capabilities: string[] = [], cap: string) {
  return capabilities.includes(cap);
}
