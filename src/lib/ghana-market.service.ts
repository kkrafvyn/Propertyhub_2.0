import { supabase } from "./supabase";
import { listingService } from "./listing.service";

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

function mapLocationRow(row: Record<string, unknown>): GhanaLocationInsight {
  return {
    city: String(row.city || ""),
    region: String(row.region || ""),
    neighborhood: String(row.neighborhood || ""),
    safetyScore: Number(row.safety_score || 0),
    investmentScore: Number(row.investment_score || 0),
    accessibilityScore: Number(row.accessibility_score || 0),
    walkabilityScore: Number(row.walkability_score || 0),
    schoolProximityScore: Number(row.school_proximity_score || 0),
    healthcareProximityScore: Number(row.healthcare_proximity_score || 0),
    floodRiskLevel: (row.flood_risk_level as GhanaLocationInsight["floodRiskLevel"]) || "unknown",
    demandLevel: (row.demand_level as GhanaLocationInsight["demandLevel"]) || "medium",
    notes: String(row.notes || ""),
  };
}

function demandLevelFromCount(count: number): GhanaLocationInsight["demandLevel"] {
  if (count >= 20) return "very_high";
  if (count >= 10) return "high";
  if (count >= 5) return "medium";
  if (count >= 2) return "low";
  return "very_low";
}

async function fetchListingsForLocation(
  city?: string | null,
  region?: string | null,
  neighborhood?: string | null
) {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      price,
      created_at,
      property:properties(city, region, neighborhood, location_confidence, flood_risk_level)
    `)
    .eq("status", "listed")
    .eq("visibility", "public");

  if (error) throw error;

  const cityKey = normalizeText(city);
  const regionKey = normalizeRegion(region);
  const neighborhoodKey = normalizeText(neighborhood);

  return (data || []).filter((listing) => {
    const property = listing.property as {
      city?: string | null;
      region?: string | null;
      neighborhood?: string | null;
    } | null;

    if (neighborhoodKey) {
      return normalizeText(property?.neighborhood) === neighborhoodKey;
    }

    if (cityKey && normalizeText(property?.city) !== cityKey) return false;
    if (regionKey && !normalizeRegion(property?.region).includes(regionKey)) return false;
    return Boolean(cityKey || regionKey);
  });
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

  async getLocationInsight(
    city?: string | null,
    region?: string | null,
    neighborhood?: string | null
  ): Promise<GhanaLocationInsight | null> {
    const cityKey = normalizeText(city);
    const regionKey = normalizeRegion(region);
    const neighborhoodKey = normalizeText(neighborhood);

    if (!cityKey && !regionKey && !neighborhoodKey) return null;

    let query = supabase.from("ghana_market_locations").select("*");

    if (cityKey) query = query.ilike("city", cityKey);
    if (regionKey) query = query.ilike("region", `%${regionKey}%`);
    if (neighborhoodKey) query = query.ilike("neighborhood", neighborhoodKey);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    if (data) return mapLocationRow(data);

    return this.computeLocationInsightFromListings(city, region, neighborhood);
  },

  async computeLocationInsightFromListings(
    city?: string | null,
    region?: string | null,
    neighborhood?: string | null
  ): Promise<GhanaLocationInsight | null> {
    const listings = await fetchListingsForLocation(city, region, neighborhood);
    if (listings.length === 0) return null;

    const sample = listings[0].property as {
      city?: string | null;
      region?: string | null;
      neighborhood?: string | null;
      location_confidence?: number | null;
      flood_risk_level?: string | null;
    } | null;

    const resolvedCity = city?.trim() || sample?.city || "";
    const resolvedRegion = region?.trim() || sample?.region || "Ghana";
    const resolvedNeighborhood =
      neighborhood?.trim() || sample?.neighborhood || resolvedCity || "Unknown";

    const avgConfidence =
      listings.reduce((sum, listing) => {
        const property = listing.property as { location_confidence?: number | null } | null;
        return sum + (property?.location_confidence || 0);
      }, 0) / listings.length;

    const normalizedScore = Math.round((avgConfidence / 100) * 5 * 10) / 10;
    const demandLevel = demandLevelFromCount(listings.length);
    const recentCount = listings.filter((listing) => {
      const createdAt = new Date(listing.created_at);
      return createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }).length;

    return {
      city: resolvedCity,
      region: resolvedRegion,
      neighborhood: resolvedNeighborhood,
      safetyScore: normalizedScore,
      investmentScore: Math.min(5, normalizedScore + (recentCount > 0 ? 0.4 : 0)),
      accessibilityScore: normalizedScore,
      walkabilityScore: Math.max(0, normalizedScore - 0.2),
      schoolProximityScore: normalizedScore,
      healthcareProximityScore: normalizedScore,
      floodRiskLevel:
        (sample?.flood_risk_level as GhanaLocationInsight["floodRiskLevel"]) || "unknown",
      demandLevel,
      notes: `${listings.length} active listings in this area${recentCount ? `, including ${recentCount} added in the last 30 days` : ""}.`,
    };
  },

  async resolveLocationContext(locationName: string) {
    const { popularLocations } = await listingService.getBrowseStats();
    const match = popularLocations.find(
      (location) => normalizeText(location.name) === normalizeText(locationName)
    );

    return {
      city: match?.city || locationName,
      region: match?.region || "Ghana",
      neighborhood: match?.name || locationName,
    };
  },

  async getSelectableLocations(limit = 12) {
    const [{ popularLocations }, marketRows] = await Promise.all([
      listingService.getBrowseStats(),
      this.listMarketLocations(limit),
    ]);

    const merged = new Map<string, { name: string; city: string; region: string; count: number }>();

    for (const location of popularLocations) {
      merged.set(normalizeText(location.name), location);
    }

    for (const row of marketRows) {
      const name = String(row.neighborhood || row.city || "").trim();
      if (!name) continue;
      const key = normalizeText(name);
      if (!merged.has(key)) {
        merged.set(key, {
          name,
          city: String(row.city || name),
          region: String(row.region || "Ghana"),
          count: 0,
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);
  },

  async listMarketLocations(limit = 50) {
    const { data, error } = await supabase
      .from("ghana_market_locations")
      .select("neighborhood, city, region")
      .order("neighborhood")
      .limit(limit);

    if (error) throw error;
    return data || [];
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
