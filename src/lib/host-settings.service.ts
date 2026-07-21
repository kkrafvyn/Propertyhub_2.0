import { supabase } from "./supabase";

export const hostSettingsService = {
  async getListingSettings(listingId: string) {
    const { data, error } = await supabase
      .from("host_listing_settings")
      .select("*")
      .eq("listing_id", listingId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsertListingSettings(input: {
    listingId: string;
    organizationId: string;
    houseRules?: string;
    checkInInstructions?: string;
    cleaningNotes?: string;
    minNights?: number;
    maxGuests?: number;
    baseNightlyMinor?: number | null;
    bookingMode?: "instant" | "request";
  }) {
    const { data, error } = await supabase
      .from("host_listing_settings")
      .upsert(
        {
          listing_id: input.listingId,
          organization_id: input.organizationId,
          house_rules: input.houseRules ?? null,
          check_in_instructions: input.checkInInstructions ?? null,
          cleaning_notes: input.cleaningNotes ?? null,
          min_nights: input.minNights ?? 1,
          max_guests: input.maxGuests ?? 4,
          base_nightly_minor: input.baseNightlyMinor ?? null,
          booking_mode: input.bookingMode ?? "instant",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "listing_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
