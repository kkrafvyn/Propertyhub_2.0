import { supabase } from "./supabase";
import { buildCheckoutPath } from "../app/lib/checkout-navigation";
import { notificationService } from "./notification.service";

function countNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export type BookingProgress = {
  payment: "not_required" | "pending" | "paid";
  stay: "requested" | "confirmed" | "cancelled" | "checked_in" | "checked_out";
  cancellable: boolean;
};

export function getBookingProgress(booking: {
  status?: string | null;
  transaction_id?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  check_in?: string | null;
}): BookingProgress {
  const status = String(booking.status || "pending");
  const stay = booking.checked_out_at
    ? "checked_out"
    : booking.checked_in_at
      ? "checked_in"
      : status === "cancelled"
        ? "cancelled"
        : status === "confirmed"
          ? "confirmed"
          : "requested";
  return {
    payment: status === "cancelled" ? "not_required" : booking.transaction_id ? "paid" : "pending",
    stay,
    cancellable: !["cancelled", "checked_in", "checked_out"].includes(stay),
  };
}

export const bookingService = {
  countNights,

  async getGuestBookings(userId: string) {
    return (await this.getGuestBookingPage(userId)).bookings;
  },

  async getGuestBookingPage(userId: string, options: { limit?: number; before?: { date: string; id: string } } = {}) {
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
    let query = supabase
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
      .order("check_in", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (options.before) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(options.before.date) || !/^[0-9a-f-]{36}$/i.test(options.before.id)) {
        throw new Error("Invalid booking cursor");
      }
      query = query.or(`check_in.lt.${options.before.date},and(check_in.eq.${options.before.date},id.lt.${options.before.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const bookings = (data || []).slice(0, limit);
    const last = bookings.at(-1);
    return {
      bookings,
      olderCursor: (data || []).length > limit && last ? { date: last.check_in, id: last.id } : null,
    };
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
    return (await this.getOrganizationBookingPage(organizationId,{limit})).bookings;
  },

  async getOrganizationBookingPage(organizationId:string,options:{limit?:number;before?:{date:string;id:string}}={}) {
    const limit=Math.min(100,Math.max(1,options.limit||50));
    let query = supabase
      .from("short_stay_bookings")
      .select(`
        *,
        guest:users!short_stay_bookings_guest_user_id_fkey(full_name, email, phone),
        listing:listings(
          id,
          property:properties(address, city)
        )
      `)
      .eq("organization_id", organizationId)
      .order("check_in", { ascending: false })
      .order("id", { ascending:false }).limit(limit+1);
    if(options.before){
      const {date,id}=options.before;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||! /^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid booking cursor');
      query=query.or(`check_in.lt.${date},and(check_in.eq.${date},id.lt.${id})`);
    }
    const {data,error}=await query;
    if (error) throw error;
    const bookings=(data||[]).slice(0,limit),last=bookings.at(-1);
    return {bookings,olderCursor:(data?.length||0)>limit&&last?{date:last.check_in,id:last.id}:null};
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
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    if (booking.transaction_id !== transactionId || booking.status !== "confirmed") {
      throw new Error("Payment is still being verified by the payment provider.");
    }
    return booking;
  },

  async approveBookingRequest(bookingId: string) {
    const { data, error } = await supabase.rpc("transition_short_stay_booking", {
      p_booking_id: bookingId,
      p_status: "confirmed",
    });

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

    const { data, error } = await supabase.rpc("create_short_stay_booking", {
      p_listing_id: input.listingId,
      p_check_in: input.checkIn,
      p_check_out: input.checkOut,
      p_guest_note: input.guestNote ?? null,
      p_booking_mode: input.bookingMode ?? "instant",
      p_currency: input.currency ?? "GHS",
    });

    if (error) throw error;

    const bookingId = data as string;
    const { data: booking, error: readError } = await supabase
      .from("short_stay_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (readError) throw readError;

    void notificationService.notifyBookingEvent(booking.id, "requested", {
      actorUserId: input.guestUserId,
    });

    return booking;
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
    const { data: prior } = await supabase
      .from("short_stay_bookings")
      .select("status, listing_id, check_in, check_out")
      .eq("id", bookingId)
      .maybeSingle();

    const { data, error } = await supabase.functions.invoke("cancel-short-stay-booking", {
      body: { bookingId, reason },
    });

    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));

    const booking = data?.booking;
    if (!booking) {
      throw new Error("Cancellation did not return booking state");
    }

    if (prior?.status === "confirmed") {
      await this.releaseBookingDates({
        listingId: prior.listing_id,
        checkIn: prior.check_in,
        checkOut: prior.check_out,
      });
    }

    void notificationService.notifyBookingEvent(bookingId, "cancelled", {
      extraContent: reason ? `Reason: ${reason}` : undefined,
    });

    return booking;
  },

  async checkInGuest(bookingId: string) {
    const { data, error } = await supabase.rpc("check_in_short_stay_booking", {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    void notificationService.notifyBookingEvent(bookingId, "checked_in");
    return data;
  },

  async checkOutGuest(bookingId: string) {
    const { data, error } = await supabase.rpc("check_out_short_stay_booking", {
      p_booking_id: bookingId,
    });

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
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    if (input.comment && input.comment.trim().length > 2000) {
      throw new Error("Review must be 2,000 characters or fewer");
    }
    const { data: session, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !session.user || session.user.id !== input.reviewerUserId) {
      throw new Error("Review identity does not match the signed-in user");
    }
    const { data, error } = await supabase.rpc("submit_booking_review", {
      p_booking_id: input.bookingId,
      p_reviewer_role: input.reviewerRole,
      p_rating: input.rating,
      p_comment: input.comment?.trim() || null,
    });

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
          guest:users!short_stay_bookings_guest_user_id_fkey(full_name, email),
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
    if (status === "cancelled") {
      return this.cancelBookingWithRefund(bookingId, "Cancelled by host");
    }
    const { data, error } = await supabase.rpc("transition_short_stay_booking", {
      p_booking_id: bookingId,
      p_status: status,
    });

    if (error) throw error;

    return data;
  },
};
