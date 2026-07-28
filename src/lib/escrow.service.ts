import { supabase } from "./supabase";

export const escrowService = {
  async getUserEscrowHolds(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from("escrow_holds")
      .select(`
        *,
        transaction:property_transactions(
          id,
          provider_reference,
          purpose,
          amount_minor,
          currency,
          paid_at,
          listing:listings(
            id,
            property:properties(address, city, region)
          )
        )
      `)
      .eq("payer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getOrganizationEscrowHolds(organizationId: string, limit = 30) {
    const { data, error } = await supabase
      .from("escrow_holds")
      .select(`
        *,
        transaction:property_transactions(
          id,
          provider_reference,
          purpose,
          amount_minor,
          currency,
          paid_at,
          payer:users(full_name, email)
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async releaseEscrowHold(holdId: string, releaseNote?: string) {
    const { data, error } = await supabase.rpc("release_escrow_hold", {
      p_hold_id: holdId,
      p_note: releaseNote || "Released from workspace payments.",
    });

    if (error) throw error;
    return data;
  },

  async disputeEscrowHold(holdId: string, disputeNote: string) {
    const { data, error } = await supabase
      .from("escrow_holds")
      .update({
        status: "disputed",
        dispute_note: disputeNote,
      })
      .eq("id", holdId)
      .eq("status", "held")
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async releasePartialEscrowHold(holdId: string, amountMinor: number, releaseNote?: string) {
    const { data, error } = await supabase.rpc("release_partial_escrow_hold", {
      p_hold_id: holdId,
      p_amount_minor: amountMinor,
      p_note: releaseNote || "Partial escrow release.",
    });

    if (error) throw error;
    return data;
  },
};
