import { supabase } from "./supabase";

const db = supabase as any;

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

export interface TrustReviewInput {
  requestId: string;
  organizationId: string;
  actorUserId: string;
  status: Exclude<TrustRequestStatus, "draft">;
  note?: string | null;
  metadata?: Record<string, unknown>;
}

export const trustVerificationService = {
  async getUserTrustRequests(userId: string) {
    const { data, error } = await supabase
      .from("trust_verification_requests")
      .select(
        `
        *,
        organization:organizations(name, slug, verified),
        listing:listings(
          id,
          price,
          currency,
          property:properties(address, city, region)
        ),
        document:organization_documents(id, title, document_type, status)
      `
      )
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

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
        evidence: (input.evidence || {}) as any,
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

  async getTrustReviewEvents(requestId: string) {
    const { data, error } = await db
      .from("trust_review_events")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async reviewTrustRequest(input: TrustReviewInput) {
    const reviewedAt = ["verified", "rejected"].includes(input.status)
      ? new Date().toISOString()
      : null;

    const { data: request, error: requestError } = await supabase
      .from("trust_verification_requests")
      .update({
        status: input.status,
        reviewed_by: input.actorUserId,
        reviewed_at: reviewedAt,
        internal_notes: input.note || null,
      })
      .eq("id", input.requestId)
      .select()
      .single();

    if (requestError) throw requestError;

    const { data: event, error: eventError } = await db
      .from("trust_review_events")
      .insert({
        request_id: input.requestId,
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        event_type: input.status,
        note: input.note || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (eventError) throw eventError;

    return { request, event };
  },
};
