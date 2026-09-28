export type JurisdictionReadinessStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "not_required"
  | "expired";

export type JurisdictionReadinessCapability =
  | "marketplace"
  | "leasing"
  | "payments"
  | "screening"
  | "esign"
  | "property_management";

export type JurisdictionReadinessRecord = {
  jurisdictionCode: string;
  enabledForMarketplace: boolean;
  enabledForLeasing: boolean;
  enabledForPayments: boolean;
  enabledForScreening: boolean;
  enabledForEsign: boolean;
  enabledForPropertyManagement: boolean;
  legalReviewStatus: JurisdictionReadinessStatus;
  privacyReviewStatus: JurisdictionReadinessStatus;
  paymentReviewStatus: JurisdictionReadinessStatus;
  taxReviewStatus: JurisdictionReadinessStatus;
  screeningReviewStatus: JurisdictionReadinessStatus;
  housingReviewStatus: JurisdictionReadinessStatus;
  rulesVersion: string;
  notes?: string | null;
};

export const DEFAULT_JURISDICTION_READINESS: JurisdictionReadinessRecord = {
  jurisdictionCode: "GLOBAL",
  enabledForMarketplace: false,
  enabledForLeasing: false,
  enabledForPayments: false,
  enabledForScreening: false,
  enabledForEsign: false,
  enabledForPropertyManagement: false,
  legalReviewStatus: "pending",
  privacyReviewStatus: "pending",
  paymentReviewStatus: "pending",
  taxReviewStatus: "pending",
  screeningReviewStatus: "pending",
  housingReviewStatus: "pending",
  rulesVersion: "unassigned",
  notes: null,
};

export function setJurisdictionReadiness(
  jurisdictionCode: string,
  patch: Partial<JurisdictionReadinessRecord>,
): JurisdictionReadinessRecord {
  return {
    ...DEFAULT_JURISDICTION_READINESS,
    ...patch,
    jurisdictionCode: String(jurisdictionCode || "GLOBAL").trim().toUpperCase() || "GLOBAL",
  };
}

export function isJurisdictionReadyFor(
  record: JurisdictionReadinessRecord | null | undefined,
  capability: JurisdictionReadinessCapability,
): boolean {
  if (!record) return false;

  const approved = (status: JurisdictionReadinessStatus) => status === "approved";

  switch (capability) {
    case "marketplace":
      return Boolean(record.enabledForMarketplace) && approved(record.legalReviewStatus) && approved(record.privacyReviewStatus);
    case "leasing":
      return (
        Boolean(record.enabledForLeasing) &&
        approved(record.legalReviewStatus) &&
        approved(record.privacyReviewStatus) &&
        approved(record.taxReviewStatus) &&
        approved(record.housingReviewStatus)
      );
    case "payments":
      return (
        Boolean(record.enabledForPayments) &&
        approved(record.legalReviewStatus) &&
        approved(record.privacyReviewStatus) &&
        approved(record.paymentReviewStatus) &&
        approved(record.taxReviewStatus)
      );
    case "screening":
      return (
        Boolean(record.enabledForScreening) &&
        approved(record.legalReviewStatus) &&
        approved(record.privacyReviewStatus) &&
        approved(record.screeningReviewStatus)
      );
    case "esign":
      return (
        Boolean(record.enabledForEsign) &&
        approved(record.legalReviewStatus) &&
        approved(record.privacyReviewStatus) &&
        approved(record.taxReviewStatus)
      );
    case "property_management":
      return (
        Boolean(record.enabledForPropertyManagement) &&
        approved(record.legalReviewStatus) &&
        approved(record.privacyReviewStatus) &&
        approved(record.taxReviewStatus) &&
        approved(record.housingReviewStatus)
      );
    default:
      return false;
  }
}

export function isHighRiskCapability(capability: JurisdictionReadinessCapability): boolean {
  return capability === "payments" || capability === "leasing" || capability === "esign";
}
