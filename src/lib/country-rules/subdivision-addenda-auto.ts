import { SUBDIVISION_OVERLAYS, type SubdivisionOverlay } from "./subdivisions";
import type { CountryCode } from "./types";
import type { SubdivisionClauseAddendum } from "./subdivision-clause-addenda";

function buildAutoAddendum(
  jurisdictionId: CountryCode,
  code: string,
  overlay: SubdivisionOverlay
): SubdivisionClauseAddendum {
  const lease = overlay.leaseRules;
  const clauses: string[] = [];

  if (lease?.requiredLeaseClauses?.length) {
    clauses.push(...lease.requiredLeaseClauses.slice(0, 4));
  }
  if (lease?.maxAdvanceRentMonths != null) {
    clauses.push(`Advance rent shall not exceed ${lease.maxAdvanceRentMonths} month(s).`);
  }
  if (lease?.maxSecurityDepositMonths != null) {
    clauses.push(`Security deposit shall not exceed ${lease.maxSecurityDepositMonths} month(s) rent.`);
  }
  if (lease?.minNoticeDaysLandlord != null) {
    clauses.push(`Landlord notice period: minimum ${lease.minNoticeDaysLandlord} days.`);
  }
  if (lease?.rentControlApplies) {
    clauses.push("Rent control or just-cause protections may apply in this subdivision.");
  }
  if (clauses.length === 0) {
    clauses.push(`Tenancy governed by ${overlay.label} local practice and national defaults.`);
  }

  return {
    jurisdictionId,
    subdivisionCode: code,
    label: overlay.label,
    title: `${overlay.label} — Regional Lease Addendum`,
    clauses,
    disclosures: (lease?.statutoryReferences || []).slice(0, 3).map((ref) => `Statute: ${ref}`),
    registrations: lease?.statutoryReferences?.slice(0, 1),
  };
}

let autoIndexCache: Map<string, SubdivisionClauseAddendum> | null = null;

export function getAutoAddendaIndex(): Map<string, SubdivisionClauseAddendum> {
  if (autoIndexCache) return autoIndexCache;
  const map = new Map<string, SubdivisionClauseAddendum>();
  for (const [jurisdictionId, subdivisions] of Object.entries(SUBDIVISION_OVERLAYS)) {
    if (!subdivisions) continue;
    for (const [code, overlay] of Object.entries(subdivisions)) {
      map.set(`${jurisdictionId}:${code}`, buildAutoAddendum(jurisdictionId as CountryCode, code, overlay));
    }
  }
  autoIndexCache = map;
  return map;
}

export function getAutoAddendum(
  jurisdictionId: CountryCode,
  subdivisionCode?: string | null
): SubdivisionClauseAddendum | null {
  if (!subdivisionCode) return null;
  return getAutoAddendaIndex().get(`${jurisdictionId}:${subdivisionCode.toUpperCase()}`) || null;
}

export function countAvailableAddenda(): number {
  return getAutoAddendaIndex().size;
}
