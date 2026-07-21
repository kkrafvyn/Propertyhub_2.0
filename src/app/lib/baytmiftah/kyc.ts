import { supabase } from "../../../lib/supabase";

export function isKycVerified(status?: string | null) {
  return status === "verified";
}

export function isKycPending(status?: string | null) {
  return status === "submitted" || status === "in_review" || status === "pending";
}

export function canSubmitOffer(status?: string | null) {
  return isKycVerified(status);
}
