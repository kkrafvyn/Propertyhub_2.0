import type { PaymentRail } from "./types";

/** Currencies PayAngels supports for cross-border settlement (expand as provider adds corridors). */
export const PAYANGELS_SUPPORTED_CURRENCIES = [
  "GHS", "NGN", "KES", "ZAR", "USD", "GBP", "EUR", "CAD", "AUD", "AED", "INR",
] as const;

export type PayAngelsCorridor = {
  currency: string;
  regions: string[];
  settlementNote?: string;
};

/** Corridor metadata for ops / admin — PayAngels settles in local currency per market. */
export const PAYANGELS_CORRIDORS: PayAngelsCorridor[] = [
  { currency: "GHS", regions: ["GH"], settlementNote: "Ghana — primary corridor" },
  { currency: "NGN", regions: ["NG"], settlementNote: "Nigeria — NGN settlement" },
  { currency: "KES", regions: ["KE"], settlementNote: "Kenya — KES settlement" },
  { currency: "ZAR", regions: ["ZA"], settlementNote: "South Africa — ZAR settlement" },
  { currency: "USD", regions: ["US", "GLOBAL"], settlementNote: "United States + international fallback" },
  { currency: "GBP", regions: ["GB"], settlementNote: "United Kingdom" },
  { currency: "EUR", regions: ["EU"], settlementNote: "Eurozone / EU member states" },
  { currency: "CAD", regions: ["CA"], settlementNote: "Canada — provincial tax overlays separate" },
  { currency: "AUD", regions: ["AU"], settlementNote: "Australia — state bond rules separate" },
  { currency: "AED", regions: ["AE"], settlementNote: "UAE — emirate compliance separate" },
  { currency: "INR", regions: ["IN"], settlementNote: "India — TDS on rent separate" },
];

const ALL_PURPOSES: PaymentRail["purposes"] = [
  "rent", "deposit", "purchase", "short_stay", "disbursement",
];

/**
 * PayAngels is the worldwide primary payment rail for BaytMiftah.
 * Local supplementary rails (MoMo, bank transfer) are optional add-ons per market.
 */
export function payAngelsPrimaryRail(localCurrency: string, extraCurrencies: string[] = []): PaymentRail {
  const currencies = Array.from(
    new Set([localCurrency, ...extraCurrencies, ...PAYANGELS_SUPPORTED_CURRENCIES])
  );
  return {
    id: "payangels",
    label: "PayAngels",
    currencies,
    purposes: ALL_PURPOSES,
    integrationSlug: "payangels",
  };
}

/** Ensures PayAngels is always first; dedupes any existing payangels entry. */
export function withPayAngelsPrimary(localCurrency: string, supplementary: PaymentRail[] = []): PaymentRail[] {
  const rest = supplementary.filter((rail) => rail.id !== "payangels");
  return [payAngelsPrimaryRail(localCurrency), ...rest];
}

export function isPayAngelsWorldwideRail(railId: string): boolean {
  return railId === "payangels";
}

export function getPayAngelsCorridor(currency: string): PayAngelsCorridor | undefined {
  return PAYANGELS_CORRIDORS.find((c) => c.currency === currency.toUpperCase());
}
