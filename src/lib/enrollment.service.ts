import { supabase } from "./supabase";

export type EnrollmentRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type WorkspaceKind = "personal" | "company";

export type OrganizationEnrollmentRequest = {
  id: string;
  requester_user_id: string;
  status: EnrollmentRequestStatus;
  workspace_kind?: WorkspaceKind;
  operating_jurisdiction?: string;
  kyc_submission_id?: string | null;
  company_name: string;
  desired_slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  business_types: string[] | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    email: string | null;
    full_name: string | null;
    verified?: boolean | null;
  } | null;
};

export type SubmitEnrollmentInput = {
  workspaceKind: WorkspaceKind;
  operatingJurisdiction: string;
  companyName: string;
  desiredSlug: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  businessTypes?: string[];
  kycSubmissionId?: string | null;
};

async function notifyEnrollmentStatus(
  requestId: string,
  event: "submitted" | "approved" | "rejected" | "withdrawn",
) {
  try {
    const appUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    await supabase.functions.invoke("send-enrollment-notification", {
      body: { requestId, event, appUrl },
    });
  } catch (error) {
    console.error("Failed to send enrollment notification email:", error);
  }
}

export const enrollmentService = {
  async getMyRequests(userId: string) {
    const { data, error } = await supabase
      .from("organization_enrollment_requests")
      .select("*")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as OrganizationEnrollmentRequest[];
  },

  async getPendingRequest(userId: string) {
    const { data, error } = await supabase
      .from("organization_enrollment_requests")
      .select("*")
      .eq("requester_user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) throw error;
    return (data as OrganizationEnrollmentRequest | null) ?? null;
  },

  async submitRequest(userId: string, input: SubmitEnrollmentInput) {
    const { data, error } = await supabase
      .from("organization_enrollment_requests")
      .insert({
        requester_user_id: userId,
        workspace_kind: input.workspaceKind,
        operating_jurisdiction: input.operatingJurisdiction,
        kyc_submission_id: input.kycSubmissionId ?? null,
        company_name: input.companyName.trim(),
        desired_slug: input.desiredSlug.trim().toLowerCase(),
        description: input.description?.trim() || null,
        contact_email: input.contactEmail?.trim() || null,
        contact_phone: input.contactPhone?.trim() || null,
        website: input.website?.trim() || null,
        business_types: input.businessTypes || [],
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw error;
    void notifyEnrollmentStatus(data.id, "submitted");
    return data as OrganizationEnrollmentRequest;
  },

  async withdrawRequest(requestId: string) {
    const { data, error } = await supabase
      .from("organization_enrollment_requests")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("*")
      .single();

    if (error) throw error;
    void notifyEnrollmentStatus(data.id, "withdrawn");
    return data as OrganizationEnrollmentRequest;
  },

  async listRequests(status?: EnrollmentRequestStatus, limit = 100) {
    const buildQuery = (select: string) => {
      let query = supabase
        .from("organization_enrollment_requests")
        .select(select)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq("status", status);
      }

      return query;
    };

    const mapRows = (rows: Array<Record<string, unknown>>) =>
      rows.map((row) => {
        const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
        return {
          ...row,
          requester: requester ?? null,
        } as OrganizationEnrollmentRequest;
      });

    const withRequester = await buildQuery(
      "*, requester:users!organization_enrollment_requests_requester_user_id_fkey(id, email, full_name, verified)",
    );

    if (!withRequester.error) {
      return mapRows((withRequester.data || []) as unknown as Array<Record<string, unknown>>);
    }

    console.warn("Enrollment requester join failed; falling back to base rows.", withRequester.error);

    const base = await buildQuery("*");
    if (base.error) throw base.error;

    return mapRows((base.data || []) as unknown as Array<Record<string, unknown>>);
  },

  async approveRequest(requestId: string, reviewNotes?: string) {
    const { data, error } = await supabase.rpc("approve_organization_enrollment_request", {
      p_request_id: requestId,
      p_review_notes: reviewNotes ?? null,
    });

    if (error) throw error;
    void notifyEnrollmentStatus(requestId, "approved");
    return data as string;
  },

  async rejectRequest(requestId: string, reviewNotes?: string) {
    const { error } = await supabase.rpc("reject_organization_enrollment_request", {
      p_request_id: requestId,
      p_review_notes: reviewNotes ?? null,
    });

    if (error) throw error;
    void notifyEnrollmentStatus(requestId, "rejected");
  },
};
