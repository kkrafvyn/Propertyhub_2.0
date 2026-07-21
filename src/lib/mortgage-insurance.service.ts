import { supabase } from "./supabase";

export const mortgageInsuranceService = {
  async getUserInquiries(userId: string) {
    const { data, error } = await supabase
      .from("mortgage_insurance_inquiries")
      .select(`
        *,
        deal_case:deal_cases(
          id,
          case_type,
          status,
          listing:listings(property:properties(address, city))
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async submitInquiry(input: {
    userId: string;
    inquiryType: "mortgage" | "insurance";
    dealCaseId?: string | null;
    listingId?: string | null;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("mortgage_insurance_inquiries")
      .insert({
        user_id: input.userId,
        inquiry_type: input.inquiryType,
        deal_case_id: input.dealCaseId || null,
        listing_id: input.listingId || null,
        notes: input.notes || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
