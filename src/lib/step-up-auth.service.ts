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
    targetResourceId?: string;
    targetAction?: string;
  }) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user || userData.user.id !== input.userId) {
      throw new Error("Step-up confirmation requires an authenticated matching user session.");
    }

    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") {
      throw new Error("Step-up confirmation requires a real MFA challenge and AAL2 assurance.");
    }

    const { data, error } = await db.rpc("create_privileged_step_up", {
      p_organization_id: input.organizationId,
      p_purpose: input.purpose,
      p_reason: input.reason || null,
      p_ttl_minutes: Math.min(Math.max(input.ttlMinutes || DEFAULT_TTL_MINUTES, 1), DEFAULT_TTL_MINUTES),
      p_target_resource_id: input.targetResourceId || null,
      p_target_action: input.targetAction || null,
    });
    if (error) throw error;
    return data;
  },

  async assertConfirmed(organizationId: string, userId: string, purpose: HighRiskPurpose) {
    const session = await this.getActiveSession(organizationId, userId, purpose);
    if (!session) {
      throw new Error(`Step-up confirmation is required for ${purpose.replace(/_/g, " ")}.`);
    }
    return session;
  },

  async revoke(id: string) {
    const { error } = await db.rpc("revoke_privileged_step_up", { p_step_up_id: id });
    if (error) throw error;
  },
};
