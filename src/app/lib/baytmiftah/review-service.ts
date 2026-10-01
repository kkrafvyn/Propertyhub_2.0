import { supabase } from "../../../lib/supabase";
import { bookingService } from "../../../lib/booking.service";

export async function fetchReviews(listingId: string) {
  const { data: bookings, error: bookingError } = await supabase.from("short_stay_bookings").select("id").eq("listing_id", listingId);
  if (bookingError) throw bookingError;
  const bookingIds = (bookings ?? []).map((row) => row.id);
  if (!bookingIds.length) return { reviews: [], source: "supabase" };
  const { data, error } = await supabase.from("booking_reviews").select("*").in("booking_id", bookingIds).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return { reviews: (data ?? []).map((row) => ({ id: row.id, rating: row.rating, body: row.comment, author: "Guest", created_at: row.created_at })), source: "supabase" };
}

export async function checkReviewEligibility(listingId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { eligible: false, reason: "auth" };
  const userId = userData.user?.id;
  if (!userId) return { eligible: false, reason: "auth" };
  const { data, error } = await supabase.from("short_stay_bookings").select("id").eq("listing_id", listingId).eq("guest_user_id", userId).eq("status", "completed").limit(1);
  if (error) throw error;
  return data?.length ? { eligible: true, reason: "booking" } : { eligible: false, reason: "no_booking" };
}

export async function submitReview({ listingId, rating, body }: { listingId: string; rating: number; body?: string }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be an integer between 1 and 5");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to leave a review");
  const { data: booking, error: bookingError } = await supabase.from("short_stay_bookings").select("id").eq("listing_id", listingId).eq("guest_user_id", userId).eq("status", "completed").order("check_out", { ascending: false }).limit(1).maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) throw new Error("Only a guest with a completed booking can review this listing");
  const review = await bookingService.submitReview({ bookingId: booking.id, reviewerUserId: userId, reviewerRole: "guest", rating, comment: body });
  return { review: { id: review.id, rating: review.rating, body: review.comment, author: "You", created_at: review.created_at }, source: "supabase" };
}
