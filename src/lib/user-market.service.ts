import {
  getJurisdictionRules,
  listSupportedJurisdictions,
  type JurisdictionId,
} from "./real-estate-compliance";
import { resolvePaymentContext } from "./payment-routing.service";

export interface UserMarket {
  jurisdictionId: JurisdictionId;
  country: string;
  region: string;
  city: string;
  searchLocation: string;
  currency: string;
  timezone: string;
  suggestedLocale: string;
  defaultListingMode: "rent" | "buy" | "stay";
  completedAt: string;
}

export interface MarketCityOption {
  city: string;
  region: string;
  searchLocation: string;
}

export interface MarketPreset {
  jurisdictionId: JurisdictionId;
  country: string;
  label: string;
  flag: string;
  cities: MarketCityOption[];
  suggestedLocale: string;
  defaultListingMode: "rent" | "buy" | "stay";
  timezone: string;
  paymentHint: string;
}

const STORAGE_KEY = "baytmiftah_user_market";
const ONBOARDING_KEY = "baytmiftah_onboarding_complete";

export const MARKET_PRESETS: MarketPreset[] = [
  {
    jurisdictionId: "GH",
    country: "Ghana",
    label: "Ghana",
    flag: "🇬🇭",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Africa/Accra",
    paymentHint: "Paystack · GHS",
    cities: [
      { city: "Accra", region: "Greater Accra", searchLocation: "Accra, Ghana" },
      { city: "Kumasi", region: "Ashanti", searchLocation: "Kumasi, Ghana" },
      { city: "Takoradi", region: "Western", searchLocation: "Takoradi, Ghana" },
    ],
  },
  {
    jurisdictionId: "NG",
    country: "Nigeria",
    label: "Nigeria",
    flag: "🇳🇬",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Africa/Lagos",
    paymentHint: "Paystack · NGN",
    cities: [
      { city: "Lagos", region: "Lagos", searchLocation: "Lagos, Nigeria" },
      { city: "Abuja", region: "FCT", searchLocation: "Abuja, Nigeria" },
      { city: "Port Harcourt", region: "Rivers", searchLocation: "Port Harcourt, Nigeria" },
    ],
  },
  {
    jurisdictionId: "KE",
    country: "Kenya",
    label: "Kenya",
    flag: "🇰🇪",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Africa/Nairobi",
    paymentHint: "Paystack · KES",
    cities: [
      { city: "Nairobi", region: "Nairobi", searchLocation: "Nairobi, Kenya" },
      { city: "Mombasa", region: "Coast", searchLocation: "Mombasa, Kenya" },
    ],
  },
  {
    jurisdictionId: "ZA",
    country: "South Africa",
    label: "South Africa",
    flag: "🇿🇦",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Africa/Johannesburg",
    paymentHint: "Paystack · ZAR",
    cities: [
      { city: "Johannesburg", region: "Gauteng", searchLocation: "Johannesburg, South Africa" },
      { city: "Cape Town", region: "Western Cape", searchLocation: "Cape Town, South Africa" },
    ],
  },
  {
    jurisdictionId: "US",
    country: "United States",
    label: "United States",
    flag: "🇺🇸",
    suggestedLocale: "en",
    defaultListingMode: "buy",
    timezone: "America/New_York",
    paymentHint: "Stripe · USD",
    cities: [
      { city: "New York", region: "New York", searchLocation: "New York, United States" },
      { city: "Los Angeles", region: "California", searchLocation: "Los Angeles, United States" },
      { city: "Houston", region: "Texas", searchLocation: "Houston, United States" },
    ],
  },
  {
    jurisdictionId: "GB",
    country: "United Kingdom",
    label: "United Kingdom",
    flag: "🇬🇧",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Europe/London",
    paymentHint: "Stripe · GBP",
    cities: [
      { city: "London", region: "England", searchLocation: "London, United Kingdom" },
      { city: "Manchester", region: "England", searchLocation: "Manchester, United Kingdom" },
    ],
  },
  {
    jurisdictionId: "EU",
    country: "Europe",
    label: "Europe",
    flag: "🇪🇺",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "Europe/Berlin",
    paymentHint: "Stripe · EUR",
    cities: [
      { city: "Berlin", region: "Germany", searchLocation: "Berlin, Germany" },
      { city: "Paris", region: "France", searchLocation: "Paris, France" },
      { city: "Madrid", region: "Spain", searchLocation: "Madrid, Spain" },
    ],
  },
  {
    jurisdictionId: "AE",
    country: "United Arab Emirates",
    label: "UAE",
    flag: "🇦🇪",
    suggestedLocale: "ar",
    defaultListingMode: "rent",
    timezone: "Asia/Dubai",
    paymentHint: "Stripe · AED",
    cities: [
      { city: "Dubai", region: "Dubai", searchLocation: "Dubai, United Arab Emirates" },
      { city: "Abu Dhabi", region: "Abu Dhabi", searchLocation: "Abu Dhabi, United Arab Emirates" },
    ],
  },
  {
    jurisdictionId: "CA",
    country: "Canada",
    label: "Canada",
    flag: "🇨🇦",
    suggestedLocale: "en",
    defaultListingMode: "buy",
    timezone: "America/Toronto",
    paymentHint: "Stripe · CAD",
    cities: [
      { city: "Toronto", region: "Ontario", searchLocation: "Toronto, Canada" },
      { city: "Vancouver", region: "British Columbia", searchLocation: "Vancouver, Canada" },
    ],
  },
  {
    jurisdictionId: "AU",
    country: "Australia",
    label: "Australia",
    flag: "🇦🇺",
    suggestedLocale: "en",
    defaultListingMode: "buy",
    timezone: "Australia/Sydney",
    paymentHint: "Stripe · AUD",
    cities: [
      { city: "Sydney", region: "New South Wales", searchLocation: "Sydney, Australia" },
      { city: "Melbourne", region: "Victoria", searchLocation: "Melbourne, Australia" },
    ],
  },
  {
    jurisdictionId: "IN",
    country: "India",
    label: "India",
    flag: "🇮🇳",
    suggestedLocale: "hi",
    defaultListingMode: "buy",
    timezone: "Asia/Kolkata",
    paymentHint: "Stripe · INR",
    cities: [
      { city: "Mumbai", region: "Maharashtra", searchLocation: "Mumbai, India" },
      { city: "Bengaluru", region: "Karnataka", searchLocation: "Bengaluru, India" },
    ],
  },
  {
    jurisdictionId: "GLOBAL",
    country: "International",
    label: "Other / International",
    flag: "🌍",
    suggestedLocale: "en",
    defaultListingMode: "rent",
    timezone: "UTC",
    paymentHint: "Stripe · USD",
    cities: [
      { city: "Worldwide", region: "Global", searchLocation: "" },
    ],
  },
];

export function getMarketPreset(jurisdictionId: JurisdictionId) {
  return MARKET_PRESETS.find((preset) => preset.jurisdictionId === jurisdictionId);
}

export function buildUserMarket(
  jurisdictionId: JurisdictionId,
  cityIndex = 0,
): UserMarket {
  const preset = getMarketPreset(jurisdictionId) ?? getMarketPreset("GLOBAL")!;
  const city = preset.cities[cityIndex] ?? preset.cities[0];
  const payment = resolvePaymentContext({
    country: preset.country,
    region: city.region,
    city: city.city,
  });

  return {
    jurisdictionId: preset.jurisdictionId,
    country: preset.country,
    region: city.region,
    city: city.city,
    searchLocation: city.searchLocation,
    currency: payment.currency,
    timezone: preset.timezone,
    suggestedLocale: preset.suggestedLocale,
    defaultListingMode: preset.defaultListingMode,
    completedAt: new Date().toISOString(),
  };
}

export function getDisplayCurrencyForMarket(market: UserMarket): "GHS" | "USD" {
  return market.jurisdictionId === "GH" ? "GHS" : "USD";
}

export function getMarketSummary(market: UserMarket) {
  const rules = getJurisdictionRules(market.jurisdictionId);
  const payment = resolvePaymentContext({
    country: market.country,
    region: market.region,
    city: market.city,
    currency: market.currency,
  });

  return {
    jurisdictionLabel: rules.label,
    paymentProvider: payment.providerLabel,
    currency: payment.currency,
    regulator: rules.realEstateRegulator,
    dataProtection: rules.dataProtectionLaw,
  };
}

export function readStoredMarket(): UserMarket | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserMarket;
  } catch {
    return null;
  }
}

export function writeStoredMarket(market: UserMarket) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(market));
  localStorage.setItem(ONBOARDING_KEY, "1");
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1" && Boolean(readStoredMarket());
  } catch {
    return false;
  }
}

export function clearStoredMarket() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
}

export function marketFromAuthMetadata(metadata?: Record<string, unknown> | null): UserMarket | null {
  if (!metadata?.market_jurisdiction) return null;
  const jurisdictionId = String(metadata.market_jurisdiction) as JurisdictionId;
  const preset = getMarketPreset(jurisdictionId);
  if (!preset) return null;

  const city = String(metadata.market_city || preset.cities[0].city);
  const region = String(metadata.market_region || preset.cities[0].region);
  const searchLocation =
    String(metadata.market_search_location || "") ||
    preset.cities.find((item) => item.city === city)?.searchLocation ||
    preset.cities[0].searchLocation;
  const payment = resolvePaymentContext({
    country: preset.country,
    region,
    city,
  });

  return {
    jurisdictionId,
    country: preset.country,
    region,
    city,
    searchLocation,
    currency: String(metadata.market_currency || payment.currency),
    timezone: preset.timezone,
    suggestedLocale: preset.suggestedLocale,
    defaultListingMode: preset.defaultListingMode,
    completedAt: new Date().toISOString(),
  };
}

export function listOnboardingMarkets() {
  return MARKET_PRESETS;
}

export function listComplianceMarkets() {
  return listSupportedJurisdictions();
}
