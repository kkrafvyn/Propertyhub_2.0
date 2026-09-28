import { supabase } from "./supabase";

const db = supabase as any;

export const ownerPayoutScheduleService = {
  async list(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await db
      .from("owner_payout_schedules")
      .select("*")
      .in("estate_id", estateIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async upsert(input: {
    estateId: string;
    ownerUserId: string;
    frequency?: "monthly" | "quarterly";
    dayOfMonth?: number;
    createdBy?: string;
  }) {
    const { data, error } = await db
      .from("owner_payout_schedules")
      .upsert({
        estate_id: input.estateId,
        owner_user_id: input.ownerUserId,
        frequency: input.frequency || "monthly",
        day_of_month: input.dayOfMonth || 1,
        active: true,
        created_by: input.createdBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async generateTaxStatement(input: {
    organizationId: string;
    ownerUserId: string;
    periodStart: string;
    periodEnd: string;
  }) {
    const { data, error } = await db.rpc("generate_owner_tax_statement", {
      p_organization_id: input.organizationId,
      p_owner_user_id: input.ownerUserId,
      p_period_start: input.periodStart,
      p_period_end: input.periodEnd,
    });
    if (error) throw error;
    return data;
  },
};
