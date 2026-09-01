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
    grossRentMinor: number;
    withholdingTaxMinor: number;
    netPaidMinor: number;
    currency?: string;
  }) {
    const { data, error } = await db
      .from("owner_tax_statements")
      .upsert({
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        gross_rent_minor: input.grossRentMinor,
        withholding_tax_minor: input.withholdingTaxMinor,
        net_paid_minor: input.netPaidMinor,
        currency: input.currency || "GHS",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
