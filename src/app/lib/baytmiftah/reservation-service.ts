import { bookingService } from "../../../lib/booking.service";
import { supabase } from "../../../lib/supabase";

export async function fetchListingAvailability(listingId: string) {
  const availability = await bookingService.getListingAvailability(listingId);
  return { availability, source: "supabase" };
}

export async function createReservation({
  listingId,
  checkIn,
  checkOut,
  guests,
  total,
}: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to book");

  const { data: listing } = await supabase
    .from("listings")
    .select("organization_id")
    .eq("id", listingId)
    .maybeSingle();

  const booking = await bookingService.createPendingBooking({
    listingId,
    organizationId: listing?.organization_id ?? "",
    guestUserId: userId,
    checkIn,
    checkOut,
    nightlyRateMinor: Math.round(total * 100),
    guestNote: guests ? `${guests} guest(s)` : undefined,
  });

  return {
    ok: true,
    reservation: booking,
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
