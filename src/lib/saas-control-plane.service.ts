import { supabase } from "./supabase";

export const saasControlPlaneService = {
  async getEntitlement(organizationId: string) {
    const { data, error } = await supabase.from("saas_organization_entitlements").select("*").eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getUsage(organizationId: string, metric?: string) {
    let query = supabase.from("saas_usage_counters").select("*").eq("organization_id", organizationId).order("period_start", { ascending: false });
    if (metric) query = query.eq("metric", metric);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  async incrementUsage(organizationId: string, metric: string, quantity = 1) {
    if (!metric.trim() || quantity <= 0) throw new Error("A positive usage quantity and metric are required");
    const { data, error } = await supabase.rpc("increment_saas_usage", { p_organization_id: organizationId, p_metric: metric.trim(), p_quantity: quantity });
    if (error) throw error;
    return Number(data) || 0;
  },
  async assertOperational(organizationId: string) {
    const entitlement = await this.getEntitlement(organizationId);
    if (entitlement?.status === "suspended" || entitlement?.status === "cancelled") throw new Error("Organization access is suspended");
    return entitlement;
  },
};