import { supabase } from "./supabase";

export type TrustRequestType =
  | "agent_identity"
  | "business_registration"
  | "property_title"
  | "address_verification"
  | "listing_review"
  | "ghana_card"
  | "tax_identity";

export type TrustRequestStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "verified"
  | "rejected"
  | "needs_changes";

export interface TrustRequestInput {
  organizationId: string;
  listingId?: string | null;
  documentId?: string | null;
  requestType: TrustRequestType;
  status?: TrustRequestStatus;
  submittedBy?: string | null;
  publicSummary?: string | null;
  internalNotes?: string | null;
  evidence?: Record<string, unknown>;
}

export const trustVerificationService = {
  async getOrganizationTrustSnapshot(organizationId: string) {
    const [requestsResult, checksResult, documentsResult] = await Promise.all([
      supabase
        .from("trust_verification_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("listing_verification_checks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("checked_at", { ascending: false }),
      supabase
        .from("organization_documents")
        .select("id, title, document_type, status, public_visibility, listing_id, updated_at")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false }),
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (checksResult.error) throw checksResult.error;
    if (documentsResult.error) throw documentsResult.error;

    const requests = requestsResult.data || [];
    const checks = checksResult.data || [];
    const documents = documentsResult.data || [];

    return {
      requests,
      checks,
      documents,
      verifiedRequests: requests.filter((item) => item.status === "verified").length,
      pendingRequests: requests.filter((item) =>
        ["submitted", "in_review", "needs_changes"].includes(item.status)
      ).length,
      passedChecks: checks.filter((item) => item.status === "passed").length,
      warningChecks: checks.filter((item) => item.status === "warning").length,
      failedChecks: checks.filter((item) => item.status === "failed").length,
      publicDocuments: documents.filter((item) => item.public_visibility).length,
    };
  },

  async submitTrustRequest(input: TrustRequestInput) {
    const status = input.status || "submitted";
    const { data, error } = await supabase
      .from("trust_verification_requests")
      .insert({
        organization_id: input.organizationId,
        listing_id: input.listingId || null,
        document_id: input.documentId || null,
        request_type: input.requestType,
        status,
        submitted_by: input.submittedBy || null,
        public_summary: input.publicSummary || null,
        internal_notes: input.internalNotes || null,
        evidence: input.evidence || {},
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateListingVerificationStatus(
    listingId: string,
    status: TrustRequestStatus,
    notes?: string
  ) {
    const { data, error } = await supabase
      .from("listings")
      .update({
        verification_status: status,
        verification_notes: notes || null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", listingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
