import { bookingService } from "../../../lib/booking.service";
import { supabase } from "../../../lib/supabase";
import { stayNights } from "./stay-date-rules";

export async function fetchListingAvailability(listingId: string) {
  const availability = await bookingService.getListingAvailability(listingId);
  return { availability, source: "supabase" };
}

export async function createReservation({
  listingId,
  checkIn,
  checkOut,
  guests,
  bookingMode = "instant",
}: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total?: number;
  bookingMode?: "instant" | "request";
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to book");

  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw new Error("Choose between 1 and 12 guests.");
  }
  const nights = stayNights(checkIn, checkOut);
  if (nights < 1 || checkIn < new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)) {
    throw new Error("Choose a future check-in and a check-out at least one night later.");
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("organization_id, price, currency, listing_type, status, visibility")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError) throw listingError;
  if (!listing || listing.listing_type !== "short_stay" || listing.status !== "listed" || listing.visibility !== "public") {
    throw new Error("This stay is not available for booking.");
  }
  if (!listing.organization_id || !Number.isFinite(Number(listing.price)) || Number(listing.price) <= 0) {
    throw new Error("Listing price or organization is unavailable.");
  }
  const nightlyRateMinor = Math.round((Number(listing?.price) || 0) * 100);

  const booking = await bookingService.createPendingBooking({
    listingId,
    organizationId: listing?.organization_id ?? "",
    guestUserId: userId,
    checkIn,
    checkOut,
    nightlyRateMinor,
    currency: listing?.currency || "GHS",
    guestNote: guests ? `${guests} guest(s)` : undefined,
    bookingMode,
  });

  return {
    ok: true,
    reservation: booking,
    bookingMode: booking.booking_mode === "request" ? "request" : "instant",
    id: booking.id,
    source: "supabase",
  };
}

export async function fetchReservations() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { reservations: [], source: "local" };

  const reservations = await bookingService.getGuestBookings(userId);
  return { reservations, source: "supabase" };
}
