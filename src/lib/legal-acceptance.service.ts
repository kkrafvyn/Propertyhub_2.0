import { supabase } from "./supabase";
import { LEGAL_POLICY_VERSION, type LegalAcceptanceScope } from "./legal-config";

export type RecordAcceptanceInput = {
  userId: string;
  scope: LegalAcceptanceScope;
  policySlugs: string[];
  policyVersion?: string;
};

export const legalAcceptanceService = {
  async recordAcceptance({
    userId,
    scope,
    policySlugs,
    policyVersion = LEGAL_POLICY_VERSION,
  }: RecordAcceptanceInput) {
    const payload = {
      user_id: userId,
      scope,
      policy_version: policyVersion,
      policies: policySlugs,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    const { error } = await supabase.from("legal_acceptances").insert(payload);
    if (error) {
      console.warn("[legal] acceptance insert failed:", error.message);
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        legal_policy_version: policyVersion,
        legal_accepted_at: new Date().toISOString(),
        legal_accepted_policies: policySlugs,
        legal_accepted_scope: scope,
      },
    });
    if (metaError) {
      console.warn("[legal] metadata update failed:", metaError.message);
    }
  },

  async getLatestAcceptance(userId: string) {
    const { data, error } = await supabase
      .from("legal_acceptances")
      .select("policy_version, policies, scope, accepted_at")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[legal] fetch acceptance failed:", error.message);
      return null;
    }
    return data;
  },

  needsReacceptance(
    acceptedVersion: string | null | undefined,
    currentVersion: string = LEGAL_POLICY_VERSION,
  ) {
    if (!acceptedVersion) return true;
    return acceptedVersion !== currentVersion;
  },

  async submitComplaint(input: {
    userId?: string | null;
    category: string;
    subject: string;
    description: string;
    listingId?: string | null;
    contactEmail?: string | null;
  }) {
    const { data, error } = await supabase
      .from("support_complaints")
      .insert({
        user_id: input.userId ?? null,
        category: input.category,
        subject: input.subject,
        description: input.description,
        listing_id: input.listingId ?? null,
        contact_email: input.contactEmail ?? null,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async submitFraudReport(input: {
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
    description: string;
  }) {
    const { data, error } = await supabase
      .from("fraud_reports")
      .insert({
        reporter_id: input.reporterId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        description: input.description,
        status: "open",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
