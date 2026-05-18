import { supabase } from "./supabase";

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
      .order("investment_score", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
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
    return data || [];
  },
};
