import type { Database } from "./database.types";
import { supabase } from "./supabase";

type LocationTrendRow = Database["public"]["Tables"]["location_trends"]["Row"];
type MarketAnalyticsRow = Database["public"]["Tables"]["market_analytics"]["Row"];

function normalizeLocationKey(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export const marketIntelligenceService = {
  async getOrganizationInsights(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_insights")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getTopLocations(limit = 6) {
    const { data, error } = await supabase
      .from("location_trends")
      .select("*")
      .order("trending_up", { ascending: false })
      .order("investment_score", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LocationTrendRow[];
  },

  async getMarketAnalytics(city: string, period = "monthly") {
    const { data, error } = await supabase
      .from("market_analytics")
      .select("*")
      .eq("location", city)
      .eq("period", period)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;
    return (data || []) as MarketAnalyticsRow[];
  },

  async getLatestMarketAnalyticsByLocations(cities: string[], period = "monthly") {
    const uniqueCities = Array.from(
      new Set(cities.map((city) => city?.trim()).filter((city): city is string => Boolean(city)))
    );

    if (!uniqueCities.length) {
      return {} as Record<string, MarketAnalyticsRow>;
    }

    const { data, error } = await supabase
      .from("market_analytics")
      .select("*")
      .in("location", uniqueCities)
      .eq("period", period)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).reduce<Record<string, MarketAnalyticsRow>>((accumulator, row) => {
      const key = normalizeLocationKey(row.location);
      if (key && !accumulator[key]) {
        accumulator[key] = row as MarketAnalyticsRow;
      }
      return accumulator;
    }, {});
  },
};
