import { supabase } from "../../../lib/supabase";

export function isKycVerified(kyc?: { status?: string | null } | string | null) {
  const status = typeof kyc === "string" ? kyc : kyc?.status;
  return status === "verified";
}

export function isKycPending(kyc?: { status?: string | null } | string | null) {
  const status = typeof kyc === "string" ? kyc : kyc?.status;
  return status === "submitted" || status === "in_review" || status === "pending";
}

export function canSubmitOffer(kyc?: { status?: string | null } | string | null) {
  return isKycVerified(kyc);
}
