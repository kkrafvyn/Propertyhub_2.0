import { supabase } from "../../../lib/supabase";

export function isKycVerified(kyc?: { status?: string | null } | string | null) {
  const status = typeof kyc === "string" ? kyc : kyc?.status;
  return status === "verified";
}

export function isKycPending(kyc?: { status?: string | null } | string | null) {
  const status = typeof kyc === "string" ? kyc : kyc?.status;
  return status === "submitted" || status === "in_review" || status === "pending";
}

export function canSubmitOffer(kyc?: { status?: string | null; verified?: boolean | null } | string | null) {
  if (typeof kyc === "object" && kyc?.verified) return true;
  return isKycVerified(kyc);
}

export function hasSubmittedKyc(kyc?: {
  status?: string | null;
  submission?: { status?: string | null } | null;
} | null) {
  if (canSubmitOffer(kyc)) return true;
  return isKycPending(kyc) || isKycPending(kyc?.submission ?? null);
}
