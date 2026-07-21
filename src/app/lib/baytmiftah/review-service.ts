import { supabase } from "../../../lib/supabase";
import { bookingService } from "../../../lib/booking.service";

export async function fetchReviews(listingId: string) {
  const { data: bookings, error: bookingError } = await supabase
    .from("short_stay_bookings")
    .select("id")
    .eq("listing_id", listingId);

  if (bookingError) {
    return { reviews: [], source: "local" };
  }

  const bookingIds = (bookings ?? []).map((row) => row.id);
  if (!bookingIds.length) {
    return { reviews: [], source: "supabase" };
  }

  const { data, error } = await supabase
    .from("booking_reviews")
    .select("*")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { reviews: [], source: "local" };
  }

  const reviews = (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.comment,
    author: "Guest",
    created_at: row.created_at,
  }));

  return { reviews, source: "supabase" };
}

export async function checkReviewEligibility(listingId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { eligible: false, reason: "auth" };

  const { data } = await supabase
    .from("short_stay_bookings")
    .select("id, status")
    .eq("listing_id", listingId)
    .eq("guest_user_id", userId)
    .in("status", ["completed", "confirmed"])
    .limit(1);

  if (data?.length) return { eligible: true, reason: "booking" };
  return { eligible: false, reason: "no_booking" };
}

export async function submitReview({
  listingId,
  rating,
  body,
}: {
  listingId: string;
  rating: number;
  body?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to leave a review");

  const { data: booking } = await supabase
    .from("short_stay_bookings")
    .select("id")
    .eq("listing_id", listingId)
    .eq("guest_user_id", userId)
    .in("status", ["completed", "confirmed"])
    .order("check_out", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!booking) {
    return {
      review: {
        id: `local-${Date.now()}`,
        rating,
        body,
        author: "You",
        created_at: new Date().toISOString(),
      },
      source: "offline",
    };
  }

  const review = await bookingService.submitReview({
    bookingId: booking.id,
    reviewerUserId: userId,
    reviewerRole: "guest",
    rating,
    comment: body,
  });

  return {
    review: {
      id: review.id,
      rating: review.rating,
      body: review.comment,
      author: "You",
      created_at: review.created_at,
    },
    source: "supabase",
  };
}
