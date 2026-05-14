export interface GhanaLocationInsight {
  city: string;
  region: string;
  neighborhood: string;
  safetyScore: number;
  investmentScore: number;
  accessibilityScore: number;
  walkabilityScore: number;
  schoolProximityScore: number;
  healthcareProximityScore: number;
  floodRiskLevel: "unknown" | "low" | "medium" | "high";
  demandLevel: "very_low" | "low" | "medium" | "high" | "very_high";
  notes: string;
}

export interface GhanaPaymentChannel {
  id: string;
  label: string;
  helper: string;
  settlementHint: string;
}

const GHANA_LOCATION_INSIGHTS: GhanaLocationInsight[] = [
  {
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "East Legon",
    safetyScore: 4.1,
    investmentScore: 4.4,
    accessibilityScore: 4.2,
    walkabilityScore: 3.9,
    schoolProximityScore: 4.2,
    healthcareProximityScore: 4.0,
    floodRiskLevel: "medium",
    demandLevel: "very_high",
    notes: "Premium rental demand with strong expat, student, and professional tenant activity.",
  },
  {
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "Cantonments",
    safetyScore: 4.5,
    investmentScore: 4.3,
    accessibilityScore: 4.1,
    walkabilityScore: 4.0,
    schoolProximityScore: 4.3,
    healthcareProximityScore: 4.4,
    floodRiskLevel: "low",
    demandLevel: "high",
    notes: "Embassy-adjacent premium apartment and serviced residence market.",
  },
  {
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "Labone",
    safetyScore: 4.2,
    investmentScore: 4.1,
    accessibilityScore: 4.2,
    walkabilityScore: 4.3,
    schoolProximityScore: 4.1,
    healthcareProximityScore: 4.2,
    floodRiskLevel: "low",
    demandLevel: "high",
    notes: "Walkable central Accra neighborhood with strong executive rental demand.",
  },
  {
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "Airport Residential",
    safetyScore: 4.4,
    investmentScore: 4.5,
    accessibilityScore: 4.5,
    walkabilityScore: 4.1,
    schoolProximityScore: 4.0,
    healthcareProximityScore: 4.5,
    floodRiskLevel: "low",
    demandLevel: "very_high",
    notes: "Premium offices and apartments near the airport and major commercial corridors.",
  },
  {
    city: "Accra",
    region: "Greater Accra",
    neighborhood: "Osu",
    safetyScore: 3.8,
    investmentScore: 4.0,
    accessibilityScore: 4.4,
    walkabilityScore: 4.5,
    schoolProximityScore: 3.8,
    healthcareProximityScore: 4.1,
    floodRiskLevel: "medium",
    demandLevel: "high",
    notes: "High foot traffic, hospitality, nightlife, and short-stay demand.",
  },
  {
    city: "Kumasi",
    region: "Ashanti",
    neighborhood: "Ahodwo",
    safetyScore: 4.0,
    investmentScore: 3.9,
    accessibilityScore: 3.8,
    walkabilityScore: 3.4,
    schoolProximityScore: 3.8,
    healthcareProximityScore: 3.9,
    floodRiskLevel: "medium",
    demandLevel: "high",
    notes: "Established residential and hospitality corridor in Kumasi.",
  },
];

const GHANA_PAYMENT_CHANNELS: GhanaPaymentChannel[] = [
  {
    id: "mtn_momo",
    label: "MTN Mobile Money",
    helper: "Best default for Ghana tenants and buyers.",
    settlementHint: "Usually routed through Paystack mobile_money.",
  },
  {
    id: "telecel_cash",
    label: "Telecel Cash",
    helper: "Useful for Vodafone/Telecel customers.",
    settlementHint: "Confirm availability in your Paystack dashboard.",
  },
  {
    id: "at_money",
    label: "AT Money",
    helper: "Covers AirtelTigo mobile money users.",
    settlementHint: "Confirm availability in your Paystack dashboard.",
  },
  {
    id: "card",
    label: "Card",
    helper: "Good fallback for diaspora and corporate clients.",
    settlementHint: "Runs through Paystack card authorization.",
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    helper: "Works well for larger deposits and business payments.",
    settlementHint: "Runs through Paystack bank transfer or bank channel.",
  },
];

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeRegion(value?: string | null) {
  return normalizeText(value).replace(/\s+region$/, "");
}

export const ghanaMarketService = {
  getPaymentChannels() {
    return GHANA_PAYMENT_CHANNELS;
  },

  normalizeGhanaPostGps(value?: string | null) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  },

  isValidGhanaPostGps(value?: string | null) {
    const normalized = this.normalizeGhanaPostGps(value);
    return /^[A-Z]{2}-\d{3,4}-\d{3,4}$/.test(normalized);
  },

  normalizeGhanaPhoneNumber(value?: string | null) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("233")) return `+${digits}`;
    if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
    if (digits.length === 9) return `+233${digits}`;
    return value?.trim() || "";
  },

  getLocationInsight(city?: string | null, region?: string | null, neighborhood?: string | null) {
    const cityKey = normalizeText(city);
    const regionKey = normalizeRegion(region);
    const neighborhoodKey = normalizeText(neighborhood);

    const exact = GHANA_LOCATION_INSIGHTS.find(
      (item) =>
        normalizeText(item.city) === cityKey &&
        normalizeRegion(item.region) === regionKey &&
        normalizeText(item.neighborhood) === neighborhoodKey
    );

    if (exact) return exact;

    return (
      GHANA_LOCATION_INSIGHTS.find(
        (item) => normalizeText(item.city) === cityKey && normalizeRegion(item.region) === regionKey
      ) ||
      GHANA_LOCATION_INSIGHTS.find((item) => normalizeText(item.city) === cityKey) ||
      null
    );
  },

  calculateLocationConfidence(input: {
    ghanaPostGps?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    neighborhood?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    let score = 0;
    if (input.address && input.address.trim().length >= 8) score += 20;
    if (input.city) score += 15;
    if (input.region) score += 15;
    if (input.neighborhood) score += 10;
    if (this.isValidGhanaPostGps(input.ghanaPostGps)) score += 30;
    if (input.latitude && input.longitude) score += 10;
    return Math.min(score, 100);
  },

  getDemandWeight(demandLevel?: string | null) {
    switch (demandLevel) {
      case "very_high":
        return 18;
      case "high":
        return 12;
      case "medium":
        return 6;
      case "low":
        return 2;
      default:
        return 0;
    }
  },
};
