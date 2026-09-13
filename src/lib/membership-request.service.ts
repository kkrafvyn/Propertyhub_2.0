import { supabase } from "./supabase";

const db = supabase as any;

export type MembershipRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type OrganizationMembershipRequest = {
  id: string;
  organization_id: string;
  user_id: string;
  message: string | null;
  requested_role: string;
  status: MembershipRequestStatus;
  property_listing_claim_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string; slug: string } | null;
};

export const membershipRequestService = {
  async getMyRequests(userId: string) {
    const { data, error } = await db
      .from("organization_membership_requests")
      .select("*, organization:organizations(id, name, slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as OrganizationMembershipRequest[];
  },

  async getOrganizationRequests(organizationId: string) {
    const { data, error } = await db
      .from("organization_membership_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as OrganizationMembershipRequest[];
  },

  async findOrganizationBySlug(slug: string) {
    const { data, error } = await db
      .from("organizations")
      .select("id, name, slug, verified, suspended")
      .eq("slug", slug.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data as { id: string; name: string; slug: string; verified: boolean; suspended: boolean } | null;
  },

  async submitRequest(input: {
    organizationId: string;
    userId: string;
    message?: string;
    requestedRole?: string;
    propertyListingClaimId?: string | null;
  }) {
    const { data, error } = await db
      .from("organization_membership_requests")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        message: input.message || null,
        requested_role: input.requestedRole || "property_owner",
        property_listing_claim_id: input.propertyListingClaimId || null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as OrganizationMembershipRequest;
  },

  async reviewRequest(input: {
    requestId: string;
    status: "approved" | "rejected";
    reviewNotes?: string;
    role?: string;
  }) {
    const { data, error } = await db.rpc("review_organization_membership_request", {
      p_request_id: input.requestId,
      p_status: input.status,
      p_review_notes: input.reviewNotes || null,
      p_role: input.role || null,
    });
    if (error) throw error;
    return data as OrganizationMembershipRequest;
  },
};
