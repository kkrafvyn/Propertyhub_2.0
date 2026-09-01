import { supabase } from "./supabase";
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
};
