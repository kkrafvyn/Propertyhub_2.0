import { LEGAL_JURISDICTIONS, type JurisdictionAddendum, type JurisdictionCoverageStatus } from "../content/legal/jurisdictions";
import { resolveJurisdiction, type JurisdictionId } from "./real-estate-compliance";

export type LegalTransactionalAction =
  | "listing_publish"
  | "payment_checkout"
  | "lease_signature"
  | "tenant_screening";

const TRANSACTIONAL_ALLOWED: JurisdictionCoverageStatus[] = ["production_ready"];

export function normalizeJurisdictionSlug(value?: string | null): JurisdictionId | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const bySlug = LEGAL_JURISDICTIONS.find((j) => j.slug.toUpperCase() === upper);
  if (bySlug) return bySlug.slug as JurisdictionId;
  return resolveJurisdiction({ country: raw, region: "", city: "" });
}

export function getLegalJurisdictionAddendum(jurisdictionCode?: string | null): JurisdictionAddendum | undefined {
  const id = normalizeJurisdictionSlug(jurisdictionCode);
  if (!id) return undefined;
  return LEGAL_JURISDICTIONS.find((j) => j.slug === id);
}

export function isLegalJurisdictionTransactionalAllowed(jurisdictionCode?: string | null): boolean {
  const addendum = getLegalJurisdictionAddendum(jurisdictionCode);
  if (!addendum) return false;
  return TRANSACTIONAL_ALLOWED.includes(addendum.status);
}

export function legalJurisdictionGateMessage(
  jurisdictionCode: string,
  action: LegalTransactionalAction,
): string {
  const addendum = getLegalJurisdictionAddendum(jurisdictionCode);
  const label = addendum?.label || jurisdictionCode;
  const status = addendum?.status || "unknown";
  return `BaytMiftah ${action.replace(/_/g, " ")} is not enabled for ${label} (${status}). Only production-ready jurisdictions may run this workflow. Other markets remain informational until counsel sign-off.`;
}

export function validateLegalJurisdictionForTransactionalAction(input: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  action: LegalTransactionalAction;
}): { allowed: boolean; jurisdictionCode: JurisdictionId; message?: string } {
  const jurisdictionCode = resolveJurisdiction({
    country: input.country || "",
    region: input.region || "",
    city: input.city || "",
  });
  const allowed = isLegalJurisdictionTransactionalAllowed(jurisdictionCode);
  return {
    allowed,
    jurisdictionCode,
    message: allowed ? undefined : legalJurisdictionGateMessage(jurisdictionCode, input.action),
  };
}
