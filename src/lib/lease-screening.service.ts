import { supabase } from "./supabase";
import {
  getProviderForCheck,
  isScreeningCheckAvailable,
  type ScreeningCheckType,
  type ScreeningRecommendation,
} from "./tenant-screening-providers";

export type { ScreeningRecommendation };

const db = supabase as any;

export function validateLeaseApplicationInput(input: { applicantName: string; applicantEmail: string; householdSize: number }) {
  if (!input.applicantName.trim() || !input.applicantEmail.trim()) return "Applicant name and email are required";
  if (!Number.isInteger(input.householdSize) || input.householdSize < 1) return "Household size must be a positive whole number";
  return null;
}

/** Provider-neutral screening workflow. A provider adapter supplies the external
 * reference and result; final approval always remains a human decision. */
export const leaseScreeningService = {
  async submitApplication(input: {
    estateId: string;
    unitId?: string;
    applicantUserId?: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    householdSize: number;
    employmentSummary?: string;
  }) {
    const validationError = validateLeaseApplicationInput(input);
    if (validationError) throw new Error(validationError);
    const { data, error } = await db.from("estate_lease_applications").insert({
      estate_id: input.estateId,
      unit_id: input.unitId || null,
      applicant_user_id: input.applicantUserId || null,
      public_token: crypto.randomUUID(),
      applicant_name: input.applicantName.trim(),
      applicant_email: input.applicantEmail.trim().toLowerCase(),
      applicant_phone: input.applicantPhone?.trim() || null,
      household_size: input.householdSize,
      employment_summary: input.employmentSummary?.trim() || null,
    }).select("*").single();
    if (error) throw error;
    return data;
  },
  async getApplicationByToken(publicToken: string) {
    const { data, error } = await db.from("estate_lease_applications").select("*").eq("public_token", publicToken).maybeSingle();
    if (error) throw error;
    return data;
  },
  async listMyApplications(userId: string) {
    const { data, error } = await db.from("estate_lease_applications").select("id, estate_id, unit_id, applicant_name, applicant_email, applicant_phone, household_size, employment_summary, status, review_note, submitted_at, reviewed_at").eq("applicant_user_id", userId).order("submitted_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async reviewApplication(applicationId: string, decision: "approved" | "rejected", reviewedBy: string, note?: string) {
    const { data, error } = await db.from("estate_lease_applications").update({
      status: decision,
      reviewed_by: reviewedBy,
      review_note: note?.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", applicationId).in("status", ["submitted", "screening"]).select("*").single();
    if (error) throw error;
    return data;
  },
  async start(input: { dealCaseId: string; provider: string; providerCaseReference?: string }) {
    const { data, error } = await db.from("estate_lease_screenings").upsert({ deal_case_id: input.dealCaseId, provider: input.provider, provider_case_reference: input.providerCaseReference || null, status: "submitted" }, { onConflict: "deal_case_id,provider" }).select("*").single();
    if (error) throw error; return data;
  },
  async recordResult(input: { screeningId: string; status: "completed" | "manual_review" | "failed"; recommendation?: "clear" | "review" | "decline"; resultSummary?: string; reviewedBy: string }) {
    const { data, error } = await db.from("estate_lease_screenings").update({ status: input.status, recommendation: input.recommendation || null, result_summary: input.resultSummary || null, reviewed_by: input.reviewedBy, reviewed_at: new Date().toISOString() }).eq("id", input.screeningId).select("*").single();
    if (error) throw error; return data;
  },
  async listForOrganization(organizationId: string) { const { data, error } = await db.from("estate_lease_screenings").select("*, deal_case:deal_cases!inner(id,case_type,status,organization_id,user_id)").eq("deal_case.organization_id", organizationId).order("created_at", { ascending: false }); if (error) throw error; return data || []; },

  async submitScreeningCheck(input: {
    organizationId: string;
    screeningId?: string;
    applicationId?: string;
    checkType: ScreeningCheckType;
    applicantName: string;
    applicantEmail: string;
    reviewedBy?: string;
  }) {
    const provider = getProviderForCheck(input.checkType);
    if (!provider) throw new Error(`No provider configured for ${input.checkType} checks.`);
    if (!isScreeningCheckAvailable(input.checkType)) {
      throw new Error(`Provider not configured for ${input.checkType} checks.`);
    }

    const result = await provider.submitCheck({
      applicantName: input.applicantName,
      applicantEmail: input.applicantEmail,
      checkType: input.checkType,
    });

    const providerMode = String(result.resultPayload?.mode || "");
    const status = providerMode === "live" ? "completed" : "manual_review";
    const { data, error } = await db.from("tenant_screening_checks").insert({
      organization_id: input.organizationId,
      screening_id: input.screeningId || null,
      application_id: input.applicationId || null,
      check_type: input.checkType,
      provider: result.provider,
      provider_reference: result.providerReference,
      status,
      recommendation: result.recommendation,
      result_summary: result.resultSummary,
      result_payload: result.resultPayload,
      reviewed_by: input.reviewedBy || null,
      reviewed_at: status === "completed" ? new Date().toISOString() : null,
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async listScreeningChecks(organizationId: string, filters?: { checkType?: ScreeningCheckType; applicationId?: string }) {
    let query = db.from("tenant_screening_checks").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (filters?.checkType) query = query.eq("check_type", filters.checkType);
    if (filters?.applicationId) query = query.eq("application_id", filters.applicationId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async runSelectedScreeningChecks(input: {
    organizationId: string;
    applicationId?: string;
    screeningId?: string;
    applicantName: string;
    applicantEmail: string;
    reviewedBy?: string;
    checkTypes: ScreeningCheckType[];
  }) {
    const unique = [...new Set(input.checkTypes)];
    if (unique.length === 0) throw new Error("Select at least one screening check.");

    for (const checkType of unique) {
      if (!isScreeningCheckAvailable(checkType)) {
        throw new Error(`Provider not configured for ${checkType} checks.`);
      }
    }

    return Promise.all(
      unique.map((checkType) =>
        this.submitScreeningCheck({
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          screeningId: input.screeningId,
          applicantName: input.applicantName,
          applicantEmail: input.applicantEmail,
          reviewedBy: input.reviewedBy,
          checkType,
        }),
      ),
    );
  },

  /** @deprecated Use runSelectedScreeningChecks */
  async runFullUsScreeningPack(input: {
    organizationId: string;
    applicationId?: string;
    screeningId?: string;
    applicantName: string;
    applicantEmail: string;
    reviewedBy?: string;
  }) {
    return this.runSelectedScreeningChecks({
      ...input,
      checkTypes: ["credit", "criminal", "eviction"],
    });
  },
};
