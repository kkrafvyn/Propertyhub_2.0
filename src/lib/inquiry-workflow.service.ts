import { supabase } from "./supabase";

export function applicationCaseTypeForListing(listingType?: string | null) {
  switch (listingType) {
    case "sale":
      return "purchase_offer" as const;
    case "lease":
      return "lease_application" as const;
    default:
      return "rental_application" as const;
  }
}

export const inquiryWorkflowService = {
  async startApplicationFromInquiry(input: {
    inquiryDealCaseId: string;
    userId: string;
    message?: string;
  }) {
    const { data: inquiry, error: inquiryError } = await supabase
      .from("deal_cases")
      .select("*, listing:listings(listing_type, organization_id)")
      .eq("id", input.inquiryDealCaseId)
      .eq("user_id", input.userId)
      .single();

    if (inquiryError) throw inquiryError;
    if (inquiry.case_type !== "property_inquiry") {
      throw new Error("Only property enquiries can be promoted to an application.");
    }

    const listingType = (inquiry.listing as { listing_type?: string } | null)?.listing_type;
    const caseType = applicationCaseTypeForListing(listingType);

    const { data: created, error: createError } = await supabase
      .from("deal_cases")
      .insert({
        listing_id: inquiry.listing_id,
        user_id: input.userId,
        organization_id: inquiry.organization_id,
        case_type: caseType,
        status: "pending",
        pipeline_stage: caseType === "purchase_offer" ? "negotiation" : "qualified",
        message: input.message || inquiry.message || "Application started from enquiry.",
        source_deal_case_id: inquiry.id,
      })
      .select("*")
      .single();

    if (createError) throw createError;

    await supabase
      .from("deal_cases")
      .update({
        pipeline_stage: "qualified",
        last_stage_updated_at: new Date().toISOString(),
      })
      .eq("id", inquiry.id);

    return created;
  },
};
