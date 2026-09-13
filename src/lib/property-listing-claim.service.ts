import { supabase } from "./supabase";

const db = supabase as any;

export type PropertyListingClaimStatus =
  | "pending"
  | "needs_info"
  | "approved"
  | "rejected"
  | "withdrawn";

export type PropertyListingClaim = {
  id: string;
  listing_id: string;
  property_id: string | null;
  organization_id: string;
  claimant_user_id: string;
  status: PropertyListingClaimStatus;
  evidence_storage_paths: string[];
  claimant_note: string | null;
  reviewer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const propertyListingClaimService = {
  async getMyClaims(userId: string) {
    const { data, error } = await db
      .from("property_listing_claims")
      .select("*")
      .eq("claimant_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PropertyListingClaim[];
  },

  async getApprovedClaims(userId: string) {
    const claims = await this.getMyClaims(userId);
    return claims.filter((claim) => claim.status === "approved");
  },

  async getOrganizationClaims(organizationId: string) {
    const { data, error } = await db
      .from("property_listing_claims")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PropertyListingClaim[];
  },

  async submitClaim(input: {
    listingId: string;
    claimantNote?: string;
    evidenceStoragePaths?: string[];
  }) {
    const { data, error } = await db.rpc("submit_property_listing_claim", {
      p_listing_id: input.listingId,
      p_claimant_note: input.claimantNote || null,
      p_evidence_storage_paths: input.evidenceStoragePaths || [],
    });
    if (error) throw error;
    return data as PropertyListingClaim;
  },

  async reviewClaim(input: {
    claimId: string;
    status: "approved" | "rejected" | "needs_info";
    reviewerNote?: string;
  }) {
    const { data, error } = await db.rpc("review_property_listing_claim", {
      p_claim_id: input.claimId,
      p_status: input.status,
      p_reviewer_note: input.reviewerNote || null,
    });
    if (error) throw error;
    return data as PropertyListingClaim;
  },

  async withdrawClaim(claimId: string) {
    const { data, error } = await db
      .from("property_listing_claims")
      .update({ status: "withdrawn", updated_at: new Date().toISOString() })
      .eq("id", claimId)
      .select("*")
      .single();
    if (error) throw error;
    return data as PropertyListingClaim;
  },
};
