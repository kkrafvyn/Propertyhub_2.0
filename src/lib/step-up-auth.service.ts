import { supabase } from "./supabase";

const db = supabase as any;
const DEFAULT_TTL_MINUTES = 15;

export const HIGH_RISK_PURPOSES = [
  "refund",
  "owner_payout",
  "bank_account_change",
  "bulk_operation",
  "break_glass",
] as const;

export type HighRiskPurpose = (typeof HIGH_RISK_PURPOSES)[number];

export const stepUpAuthService = {
  async getActiveSession(organizationId: string, userId: string, purpose: HighRiskPurpose) {
    const { data, error } = await db
      .from("privileged_step_up")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async confirm(input: {
    organizationId: string;
    userId: string;
    purpose: HighRiskPurpose;
    reason?: string;
    ttlMinutes?: number;
  }) {
    const expiresAt = new Date(
      Date.now() + (input.ttlMinutes || DEFAULT_TTL_MINUTES) * 60 * 1000
    ).toISOString();
    const { data, error } = await db
      .from("privileged_step_up")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        purpose: input.purpose,
        reason: input.reason || null,
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async assertConfirmed(organizationId: string, userId: string, purpose: HighRiskPurpose) {
    const session = await this.getActiveSession(organizationId, userId, purpose);
    if (!session) {
      throw new Error(`Step-up confirmation required for ${purpose.replace(/_/g, " ")}.`);
    }
    return session;
  },

  async revoke(id: string) {
    const { error } = await db
      .from("privileged_step_up")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
