import type { Database } from "./database.types";
import { supabase } from "./supabase";

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
    settlementHint: "Usually routed through a mobile-money gateway rail.",
  },
  {
    id: "telecel_cash",
    label: "Telecel Cash",
    helper: "Useful for Vodafone/Telecel customers.",
    settlementHint: "Confirm availability in the selected gateway dashboard.",
  },
  {
    id: "at_money",
    label: "AT Money",
    helper: "Covers AirtelTigo mobile money users.",
    settlementHint: "Confirm availability in the selected gateway dashboard.",
  },
  {
    id: "card",
    label: "Card",
    helper: "Good fallback for diaspora and corporate clients.",
    settlementHint: "Runs through gateway card authorization.",
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    helper: "Works well for larger deposits and business payments.",
    settlementHint: "Runs through bank transfer or bank channel rails.",
  },
];

type GhanaMarketLocationRow = Database["public"]["Tables"]["ghana_market_locations"]["Row"];

let remoteLocationInsightsPromise: Promise<GhanaLocationInsight[]> | null = null;
let cachedLocationInsights: GhanaLocationInsight[] | null = null;

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeRegion(value?: string | null) {
  return normalizeText(value).replace(/\s+region$/, "");
}

function mapLocationInsightRow(row: GhanaMarketLocationRow): GhanaLocationInsight {
  return {
    city: row.city,
    region: row.region,
    neighborhood: row.neighborhood,
    safetyScore: Number(row.safety_score || 0),
    investmentScore: Number(row.investment_score || 0),
    accessibilityScore: Number(row.accessibility_score || 0),
    walkabilityScore: Number(row.walkability_score || 0),
    schoolProximityScore: Number(row.school_proximity_score || 0),
    healthcareProximityScore: Number(row.healthcare_proximity_score || 0),
    floodRiskLevel: row.flood_risk_level as GhanaLocationInsight["floodRiskLevel"],
    demandLevel: row.demand_level as GhanaLocationInsight["demandLevel"],
    notes: row.notes || "",
  };
}

function findLocationInsight(
  insights: GhanaLocationInsight[],
  city?: string | null,
  region?: string | null,
  neighborhood?: string | null
) {
  const cityKey = normalizeText(city);
  const regionKey = normalizeRegion(region);
  const neighborhoodKey = normalizeText(neighborhood);

  const exact = insights.find(
    (item) =>
      normalizeText(item.city) === cityKey &&
      normalizeRegion(item.region) === regionKey &&
      normalizeText(item.neighborhood) === neighborhoodKey
  );

  if (exact) return exact;

  return (
    insights.find(
      (item) => normalizeText(item.city) === cityKey && normalizeRegion(item.region) === regionKey
    ) || insights.find((item) => normalizeText(item.city) === cityKey) || null
  );
}

export const ghanaMarketService = {
  getPaymentChannels() {
    return GHANA_PAYMENT_CHANNELS;
  },

  async getLocationInsights() {
    if (!remoteLocationInsightsPromise) {
      remoteLocationInsightsPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from("ghana_market_locations")
            .select("*")
            .order("investment_score", { ascending: false, nullsFirst: false });

          if (error) throw error;

          const mapped = (data || []).map(mapLocationInsightRow);
          cachedLocationInsights = mapped.length > 0 ? mapped : GHANA_LOCATION_INSIGHTS;
          return cachedLocationInsights;
        } catch (error) {
          console.warn("Falling back to bundled Ghana market insights:", error);
          cachedLocationInsights = GHANA_LOCATION_INSIGHTS;
          return GHANA_LOCATION_INSIGHTS;
        }
      })();
    }

    return remoteLocationInsightsPromise;
  },

  async getLocationInsightAsync(city?: string | null, region?: string | null, neighborhood?: string | null) {
    const insights = await this.getLocationInsights();
    return findLocationInsight(insights, city, region, neighborhood);
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
    return findLocationInsight(cachedLocationInsights || GHANA_LOCATION_INSIGHTS, city, region, neighborhood);
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
