import type { JurisdictionId } from "./real-estate-compliance";
import { getJurisdictionRules } from "./real-estate-compliance";
import { getCountryPack } from "./country-rules";
import {
  canSubmitOffer,
  isKycPending,
  isKycVerified,
} from "../app/lib/baytmiftah/kyc";

export type KycContext = "consumer" | "workspace";
export type KycPurpose = "consumer_booking" | "consumer_offer" | "workspace_enrollment";

export type PlatformKycPolicy = {
  jurisdiction_id: string;
  label: string;
  consumer_booking_required: boolean;
  workspace_enrollment_required: boolean;
  provider_engine: string;
  enabled: boolean;
};

export type KycSnapshot = {
  status?: string | null;
  verified?: boolean | null;
  submission?: {
    status?: string | null;
    provider_engine?: string | null;
    ai_source?: string | null;
    jurisdiction_id?: string | null;
    context?: string | null;
  } | null;
};

/** Screening engine slug for a jurisdiction (country pack + platform default). */
export function resolveKycEngine(jurisdictionId: JurisdictionId | string): string {
  const pack = getCountryPack(jurisdictionId as JurisdictionId);
  return pack.screening?.providerSlug ?? "internal-kyc";
}

export function requiresConsumerKycForBooking(
  jurisdictionId: JurisdictionId | string,
  policy?: Pick<PlatformKycPolicy, "consumer_booking_required" | "enabled"> | null,
): boolean {
  if (policy && policy.enabled === false) return false;
  if (policy?.consumer_booking_required === false) return false;
  return getJurisdictionRules(jurisdictionId as JurisdictionId).amlKycRequired;
}

export function requiresWorkspaceKycForEnrollment(
  jurisdictionId: JurisdictionId | string,
  policy?: Pick<PlatformKycPolicy, "workspace_enrollment_required" | "enabled"> | null,
): boolean {
  if (policy && policy.enabled === false) return false;
  if (policy?.workspace_enrollment_required === false) return false;
  return getJurisdictionRules(jurisdictionId as JurisdictionId).amlKycRequired;
}

export function hasKycSubmission(kyc?: KycSnapshot | null): boolean {
  if (!kyc) return false;
  if (isKycVerified(kyc) || isKycPending(kyc)) return true;
  const status = kyc.submission?.status;
  return status === "submitted" || status === "in_review" || status === "verified";
}

export function canBookStay(
  kyc: KycSnapshot | null | undefined,
  jurisdictionId: JurisdictionId | string,
  policy?: Pick<PlatformKycPolicy, "consumer_booking_required" | "enabled"> | null,
): boolean {
  if (!requiresConsumerKycForBooking(jurisdictionId, policy)) return true;
  return canSubmitOffer(kyc);
}

export function canSubmitWorkspaceEnrollment(
  kyc: KycSnapshot | null | undefined,
  jurisdictionId: JurisdictionId | string,
  policy?: Pick<PlatformKycPolicy, "workspace_enrollment_required" | "enabled"> | null,
): boolean {
  if (!requiresWorkspaceKycForEnrollment(jurisdictionId, policy)) return true;
  return hasKycSubmission(kyc);
}

export function describeKycEngine(kyc?: KycSnapshot | null, jurisdictionId?: string | null): string {
  const submission = kyc?.submission;
  if (submission?.ai_source) return submission.ai_source;
  if (submission?.provider_engine) return submission.provider_engine;
  if (jurisdictionId) return resolveKycEngine(jurisdictionId);
  return "internal-kyc";
}

export function personalWorkspaceSlug(userId: string): string {
  const token = userId.replace(/-/g, "").slice(0, 10).toLowerCase();
  return `personal-${token}`;
}

export function personalWorkspaceName(displayName?: string | null): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return "My Property Workspace";
  if (/workspace|properties/i.test(trimmed)) return trimmed;
  return `${trimmed}'s Properties`;
}
