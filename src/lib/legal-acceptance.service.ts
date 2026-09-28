import { supabase } from "./supabase";
import { LEGAL_POLICY_VERSION, type LegalAcceptanceScope } from "./legal-config";

export type RecordAcceptanceInput = {
  userId: string;
  scope: LegalAcceptanceScope;
  policySlugs: string[];
  policyVersion?: string;
};

export const legalAcceptanceService = {
  async recordAcceptance({ scope }: RecordAcceptanceInput) {
    const { error } = await (supabase as any).rpc("record_legal_acceptance", {
      p_scope: scope,
      p_jurisdiction: null,
    });
    if (error) throw error;
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
    const { data, error } = await (supabase as any).rpc("submit_support_complaint", {
      p_category: input.category,
      p_subject: input.subject,
      p_description: input.description,
      p_listing_id: input.listingId ?? null,
      p_contact_email: input.contactEmail ?? null,
    });

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
