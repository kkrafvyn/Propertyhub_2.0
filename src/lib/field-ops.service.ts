import { supabase } from "./supabase";

export const fieldOpsService = {
  async getRecentLogs(organizationId: string, limit = 20) {
    const { data, error } = await supabase
      .from("field_activity_logs")
      .select(
        `
        *,
        user:users(id, full_name, email),
        viewing:property_viewings(
          id,
          status,
          listing:listings(
            id,
            property:properties(address, city, region)
          )
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async logActivity(input: {
    organizationId: string;
    userId: string;
    title: string;
    details?: string;
    dealCaseId?: string | null;
    viewingId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    const { data, error } = await supabase
      .from("field_activity_logs")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        title: input.title,
        details: input.details || null,
        deal_case_id: input.dealCaseId || null,
        viewing_id: input.viewingId || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
