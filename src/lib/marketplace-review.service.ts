import { canMarkReviewVerified, buildReviewSummary } from "./competitive-features.service";
import { supabase } from "./supabase";

export type ReviewTargetType = "listing" | "agency" | "project" | "vendor" | "deal";

export interface MarketplaceReviewInput {
  targetType: ReviewTargetType;
  reviewerUserId: string;
  rating: number;
  title?: string | null;
  reviewText: string;
  listingId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  vendorId?: string | null;
  dealCaseId?: string | null;
  inquiryId?: string | null;
  viewingId?: string | null;
  paymentId?: string | null;
}

function isMissingReviewTable(error: any) {
  return error?.code === "PGRST205" || /marketplace_reviews/i.test(String(error?.message || ""));
}

export const marketplaceReviewService = {
  async getApprovedReviewsForListing(listingId: string) {
    const { data, error } = await supabase
      .from("marketplace_reviews" as any)
      .select("*")
      .eq("listing_id", listingId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingReviewTable(error)) return [];
      throw error;
    }
    return data || [];
  },

  async getApprovedReviewsForOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from("marketplace_reviews" as any)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingReviewTable(error)) return [];
      throw error;
    }
    return data || [];
  },

  async getListingReviewSummary(listingId: string) {
    const reviews = await this.getApprovedReviewsForListing(listingId);
    return buildReviewSummary({ reviews });
  },

  async submitReview(input: MarketplaceReviewInput) {
    const verification = canMarkReviewVerified({
      inquiryId: input.inquiryId,
      viewingId: input.viewingId,
      paymentId: input.paymentId,
      dealCaseId: input.dealCaseId,
    });

    const { data, error } = await supabase
      .from("marketplace_reviews" as any)
      .insert({
        target_type: input.targetType,
        reviewer_user_id: input.reviewerUserId,
        rating: Math.max(1, Math.min(5, Math.round(input.rating))),
        title: input.title || null,
        review_text: input.reviewText,
        listing_id: input.listingId || null,
        organization_id: input.organizationId || null,
        project_id: input.projectId || null,
        vendor_id: input.vendorId || null,
        deal_case_id: input.dealCaseId || null,
        verified: verification.verified,
        verified_source: verification.source,
        status: "submitted",
        metadata: {
          inquiryId: input.inquiryId || null,
          viewingId: input.viewingId || null,
          paymentId: input.paymentId || null,
        },
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async reportReview(reviewId: string, reporterUserId: string, reason: string) {
    const { data, error } = await supabase
      .from("marketplace_review_reports" as any)
      .insert({
        review_id: reviewId,
        reporter_user_id: reporterUserId,
        reason,
        status: "submitted",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
