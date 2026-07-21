import { bookingService } from "../../../lib/booking.service";
import { supabase } from "../../../lib/supabase";
import { openListingConversation } from "./messaging-service";

export async function getAvailability(listingId: string) {
  const rows = await bookingService.getListingAvailability(listingId);
  return { availability: rows, source: "supabase" };
}

export async function requestViewing({
  listingId,
  listingTitle,
  preferredDate,
  preferredTime,
  notes,
}: {
  listingId: string;
  listingTitle?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to request a viewing");

  const intro = [
    `I'd like to schedule a viewing for ${listingTitle || "this property"}.`,
    preferredDate ? `Preferred date: ${preferredDate}` : null,
    preferredTime ? `Preferred time: ${preferredTime}` : null,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await openListingConversation({
    listingId,
    listingTitle,
    initialMessage: intro,
  });

  return { ok: true, conversationId: result.conversationId, source: "supabase" };
}
