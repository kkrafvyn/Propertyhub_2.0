import { supabase } from "./supabase";
import { buildCheckoutPath } from "../app/lib/checkout-navigation";
import { paymentService } from "./payment.service";
import { notificationService } from "./notification.service";

function countNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export const bookingService = {
  countNights,

  async getGuestBookings(userId: string) {
    const { data, error } = await supabase
      .from("short_stay_bookings")
      .select(`
        *,
        listing:listings(
          id,
          price,
          currency,
          property:properties(address, city, region)
        ),
        organization:organizations(name, slug)
      `)
      .eq("guest_user_id", userId)
      .order("check_in", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActiveGuestBookings(userId: string) {
    const bookings = await this.getGuestBookings(userId);
    const today = new Date().toISOString().slice(0, 10);
    return bookings.filter(
      (booking) =>
        ["pending", "confirmed"].includes(booking.status) && booking.check_out >= today
    );
  },

  async getOrganizationBookings(organizationId: string, limit = 50) {
    const { data, error } = await supabase
      .from("short_stay_bookings")
      .select(`
        *,
        guest:users(full_name, email, phone),
        listing:listings(
          id,
          property:properties(address, city)
        )
      `)
      .eq("organization_id", organizationId)
      .order("check_in", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async validateDatesAvailable(listingId: string, checkIn: string, checkOut: string) {
    const availability = await this.getListingAvailability(listingId, checkIn, checkOut);
    const blocked = availability.filter((row) => row.is_available === false);
    if (blocked.length > 0) {
      throw new Error("Some of the selected dates are no longer available.");
    }

    const { data: overlapping, error } = await supabase
      .from("short_stay_bookings")
      .select("id")
      .eq("listing_id", listingId)
      .in("status", ["pending", "confirmed"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    if (error) throw error;
    if (overlapping && overlapping.length > 0) {
      throw new Error("Those dates overlap with an existing booking.");
    }
  },

  async getCheckInInstructions(bookingId: string) {
    const { data: booking, error } = await supabase
      .from("short_stay_bookings")
      .select("listing_id")
      .eq("id", bookingId)
      .single();

    if (error) throw error;

    const { data: settings } = await supabase
      .from("host_listing_settings")
      .select("check_in_instructions, house_rules, cleaning_notes")
      .eq("listing_id", booking.listing_id)
      .maybeSingle();

    return settings;
  },

  async payForBooking(booking: {
    id: string;
    listing_id: string;
    total_minor: number;
    currency?: string;
  }) {
    return buildCheckoutPath({
      listingId: booking.listing_id,
      amount: booking.total_minor / 100,
      purpose: "booking_fee",
      bookingId: booking.id,
      returnTo: "/app/reservations",
    });
  },

  async onPaymentVerified(bookingId: string, transactionId: string) {
    const { data: booking, error } = await supabase
      .from("short_stay_bookings")
      .update({ transaction_id: transactionId })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw error;

    if (booking.status === "pending" || (booking.status === "confirmed" && !booking.checked_in_at)) {
      return this.confirmBooking(bookingId);
    }

    return booking;
  },

  async approveBookingRequest(bookingId: string) {
    const { data, error } = await supabase
      .from("short_stay_bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .eq("booking_mode", "request")
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyBookingEvent(bookingId, "confirmed", {
      extraContent: "Complete payment to secure your dates.",
    });

    return data;
  },

  async getListingAvailability(listingId: string, fromDate?: string, toDate?: string) {
    let query = supabase
      .from("listing_availability")
      .select("*")
      .eq("listing_id", listingId)
      .order("available_date", { ascending: true });

    if (fromDate) query = query.gte("available_date", fromDate);
    if (toDate) query = query.lte("available_date", toDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async upsertAvailability(input: {
    listingId: string;
    availableDate: string;
    isAvailable: boolean;
    priceOverrideMinor?: number | null;
  }) {
    const { data, error } = await supabase
      .from("listing_availability")
      .upsert(
        {
          listing_id: input.listingId,
          available_date: input.availableDate,
          is_available: input.isAvailable,
          price_override_minor: input.priceOverrideMinor ?? null,
        },
        { onConflict: "listing_id,available_date" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async createPendingBooking(input: {
    listingId: string;
    organizationId: string;
    guestUserId: string;
    checkIn: string;
    checkOut: string;
    nightlyRateMinor: number;
    currency?: string;
    guestNote?: string;
    bookingMode?: "instant" | "request";
  }) {
    await this.validateDatesAvailable(input.listingId, input.checkIn, input.checkOut);

    const nights = countNights(input.checkIn, input.checkOut);
    const totalMinor = input.nightlyRateMinor * nights;

    const { data, error } = await supabase
      .from("short_stay_bookings")
      .insert({
        listing_id: input.listingId,
        organization_id: input.organizationId,
        guest_user_id: input.guestUserId,
        check_in: input.checkIn,
        check_out: input.checkOut,
        nights,
        total_minor: totalMinor,
        currency: input.currency || "GHS",
        status: "pending",
        guest_note: input.guestNote || null,
        booking_mode: input.bookingMode || "instant",
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyBookingEvent(data.id, "requested", {
      actorUserId: input.guestUserId,
    });

    return data;
  },

  async blockBookingDates(input: {
    listingId: string;
    checkIn: string;
    checkOut: string;
  }) {
    const start = new Date(`${input.checkIn}T00:00:00`);
    const end = new Date(`${input.checkOut}T00:00:00`);
    const rows: Array<{
      listing_id: string;
      available_date: string;
      is_available: boolean;
    }> = [];

    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
      rows.push({
        listing_id: input.listingId,
        available_date: cursor.toISOString().slice(0, 10),
        is_available: false,
      });
    }

    if (rows.length === 0) return;

    const { error } = await supabase
      .from("listing_availability")
      .upsert(rows, { onConflict: "listing_id,available_date" });

    if (error) throw error;
  },

  async releaseBookingDates(input: {
    listingId: string;
    checkIn: string;
    checkOut: string;
  }) {
    const start = new Date(`${input.checkIn}T00:00:00`);
    const end = new Date(`${input.checkOut}T00:00:00`);
    const dates: string[] = [];

    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
      dates.push(cursor.toISOString().slice(0, 10));
    }

    if (dates.length === 0) return;

    const { error } = await supabase
      .from("listing_availability")
      .delete()
      .eq("listing_id", input.listingId)
      .in("available_date", dates);

    if (error) throw error;
  },

  async confirmBooking(bookingId: string) {
    const { data: booking, error } = await supabase
      .from("short_stay_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) throw error;

    await this.blockBookingDates({
      listingId: booking.listing_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    });

    const confirmed = await this.updateBookingStatus(bookingId, "confirmed");
    void notificationService.notifyBookingEvent(bookingId, "confirmed");

    const instructions = await this.getCheckInInstructions(bookingId);
    if (instructions?.check_in_instructions && booking.guest_user_id) {
      void notificationService.notifyUser({
        userId: booking.guest_user_id,
        notificationType: "booking_check_in_instructions",
        subject: "Check-in instructions",
        content: instructions.check_in_instructions.slice(0, 500),
        category: "Bookings",
        actionUrl: "/app/trips",
        metadata: { bookingId },
      });
    }

    return confirmed;
  },

  async cancelBookingWithRefund(bookingId: string, reason?: string) {
    const { data: booking, error: fetchError } = await supabase
      .from("short_stay_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError) throw fetchError;

    const refundMinor =
      booking.status === "confirmed" || booking.status === "pending"
        ? Math.round(Number(booking.total_minor) * 0.85)
        : 0;

    if (booking.transaction_id && refundMinor > 0) {
      await paymentService.initiatePropertyRefund({
        transactionId: booking.transaction_id,
        amount: refundMinor / 100,
        reason: reason || "Guest cancelled short-stay booking",
        customerNote: reason || "Booking cancellation refund",
      });
    }

    const { data, error } = await supabase
      .from("short_stay_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        refund_minor: refundMinor,
        cancellation_reason: reason || null,
      })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw error;

    if (booking.status === "confirmed") {
      await this.releaseBookingDates({
        listingId: booking.listing_id,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      });
    }

    void notificationService.notifyBookingEvent(bookingId, "cancelled", {
      extraContent: reason ? `Reason: ${reason}` : undefined,
    });

    return data;
  },

  async checkInGuest(bookingId: string) {
    const { data, error } = await supabase
      .from("short_stay_bookings")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw error;
    void notificationService.notifyBookingEvent(bookingId, "checked_in");
    return data;
  },

  async checkOutGuest(bookingId: string) {
    const { data, error } = await supabase
      .from("short_stay_bookings")
      .update({
        checked_out_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw error;
    void notificationService.notifyBookingEvent(bookingId, "checked_out");
    return data;
  },

  async submitReview(input: {
    bookingId: string;
    reviewerUserId: string;
    reviewerRole: "guest" | "host";
    rating: number;
    comment?: string;
  }) {
    const { data, error } = await supabase
      .from("booking_reviews")
      .insert({
        booking_id: input.bookingId,
        reviewer_user_id: input.reviewerUserId,
        reviewer_role: input.reviewerRole,
        rating: input.rating,
        comment: input.comment || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    void notificationService.notifyBookingEvent(input.bookingId, "review_received", {
      actorUserId: input.reviewerUserId,
      extraContent: input.comment
        ? `Rating: ${input.rating}/5 — ${input.comment.slice(0, 120)}`
        : `Rating: ${input.rating}/5`,
    });

    return data;
  },

  async getBookingReviews(bookingId: string) {
    const { data, error } = await supabase
      .from("booking_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOrganizationBookingReviews(organizationId: string, limit = 30) {
    const { data, error } = await supabase
      .from("booking_reviews")
      .select(`
        *,
        booking:short_stay_bookings!inner(
          id,
          check_in,
          check_out,
          guest:users(full_name, email),
          listing:listings(property:properties(address))
        )
      `)
      .eq("booking.organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async updateBookingStatus(bookingId: string, status: "confirmed" | "cancelled" | "completed") {
    const { data: booking, error: fetchError } = await supabase
      .from("short_stay_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from("short_stay_bookings")
      .update({ status })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw error;

    if (status === "cancelled" && booking.status === "confirmed") {
      await this.releaseBookingDates({
        listingId: booking.listing_id,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
      });
    }

    return data;
  },
};
