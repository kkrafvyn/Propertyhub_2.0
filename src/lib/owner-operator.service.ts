import { supabase } from "./supabase";
const db = supabase as any;
export type ManagementMode = "self_managed" | "company_managed" | "hybrid";
export const ownerOperatorService = {
  async setMode(input: { estateId: string; ownerUserId: string; mode: ManagementMode; managingOrganizationId?: string }) {
    const { data, error } = await db.from("estate_property_management_modes").upsert({ estate_id: input.estateId, owner_user_id: input.ownerUserId, management_mode: input.mode, managing_organization_id: input.managingOrganizationId || null, updated_at: new Date().toISOString() }, { onConflict: "estate_id" }).select("*").single();
    if (error) throw error; return data;
  },
  async getModes(estateIds: string[]) { if (!estateIds.length) return []; const { data, error } = await db.from("estate_property_management_modes").select("*").in("estate_id", estateIds); if (error) throw error; return data || []; },
};
