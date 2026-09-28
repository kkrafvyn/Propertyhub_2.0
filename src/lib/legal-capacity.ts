export const LEGAL_CAPACITY_ACTIONS = [
  "lease_signature",
  "payment_authorization",
  "payout_instruction",
  "lease_application",
  "account_transactional_use",
  "listing_publish",
] as const;

export type LegalCapacityAction = (typeof LEGAL_CAPACITY_ACTIONS)[number];

export type LegalCapacityVerificationLevel =
  | "verified"
  | "self_attested"
  | "manual_review"
  | "expired"
  | "rejected";

export type LegalCapacityVerificationSource =
  | "kyc_verified"
  | "manual_review"
  | "user_attested"
  | "government_id"
  | "system_generated";

export type LegalCapacityRecord = {
  userId?: string | null;
  verifiedDateOfBirth?: string | null;
  jurisdictionCode?: string | null;
  ageVerificationSource?: LegalCapacityVerificationSource | null;
  ageVerificationLevel?: LegalCapacityVerificationLevel | null;
  isActive?: boolean;
  requiresTrustedVerification?: boolean;
};

const MINIMUM_AGE_BY_JURISDICTION: Record<string, number> = {
  GLOBAL: 18,
  GH: 18,
  NG: 18,
  KE: 18,
  ZA: 18,
  US: 18,
  GB: 18,
  EU: 18,
  AE: 21,
  CA: 18,
  AU: 18,
  IN: 18,
};

const TRUSTED_VERIFICATION_LEVELS = new Set<LegalCapacityVerificationLevel>([
  "verified",
  "manual_review",
]);

const TRUSTED_VERIFICATION_SOURCES = new Set<LegalCapacityVerificationSource>([
  "kyc_verified",
  "government_id",
  "manual_review",
]);

export function getMinimumAgeForJurisdiction(jurisdictionCode?: string | null): number {
  const normalized = String(jurisdictionCode || "GLOBAL").trim().toUpperCase();
  return MINIMUM_AGE_BY_JURISDICTION[normalized] ?? MINIMUM_AGE_BY_JURISDICTION.GLOBAL;
}

export function buildLegalCapacityRecord(
  input: Partial<LegalCapacityRecord> & { jurisdictionCode?: string | null },
): LegalCapacityRecord {
  const jurisdictionCode = String(input.jurisdictionCode || "GLOBAL").trim().toUpperCase() || "GLOBAL";

  return {
    userId: input.userId ?? null,
    verifiedDateOfBirth: input.verifiedDateOfBirth ?? null,
    jurisdictionCode,
    ageVerificationSource: input.ageVerificationSource ?? null,
    ageVerificationLevel: input.ageVerificationLevel ?? null,
    isActive: input.isActive ?? true,
    requiresTrustedVerification: input.requiresTrustedVerification ?? true,
  };
}

function getAgeInYears(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    throw new Error("Legal capacity requires a valid verified date of birth.");
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function hasTrustedVerification(record: LegalCapacityRecord) {
  const source = record.ageVerificationSource;
  const level = record.ageVerificationLevel;

  if (source && TRUSTED_VERIFICATION_SOURCES.has(source)) return true;
  if (level && TRUSTED_VERIFICATION_LEVELS.has(level)) return true;
  return false;
}

export function assertUserLegalCapacity(
  record: LegalCapacityRecord | null | undefined,
  jurisdictionCode?: string | null,
  action: LegalCapacityAction = "account_transactional_use",
): asserts record is LegalCapacityRecord {
  if (!record) {
    throw new Error("Legal capacity cannot be confirmed for this user.");
  }

  if (record.isActive === false) {
    throw new Error("Legal capacity is inactive for this user.");
  }

  const effectiveJurisdiction = String(jurisdictionCode || record.jurisdictionCode || "GLOBAL").trim().toUpperCase();
  const minimumAge = getMinimumAgeForJurisdiction(effectiveJurisdiction);

  if (!record.verifiedDateOfBirth) {
    throw new Error("Legal capacity requires a verified date of birth.");
  }

  if (record.requiresTrustedVerification !== false && !hasTrustedVerification(record)) {
    throw new Error("Legal capacity requires a trusted verification source.");
  }

  const age = getAgeInYears(record.verifiedDateOfBirth);
  if (age < minimumAge) {
    throw new Error(
      `Legal capacity denied: user is below the minimum age (${minimumAge}) for ${effectiveJurisdiction}.`,
    );
  }

  if (!LEGAL_CAPACITY_ACTIONS.includes(action)) {
    throw new Error(`Unsupported legal-capacity action: ${String(action)}`);
  }
}

export function isUserLegallyCapable(
  record: LegalCapacityRecord | null | undefined,
  jurisdictionCode?: string | null,
  action: LegalCapacityAction = "account_transactional_use",
): boolean {
  try {
    assertUserLegalCapacity(record, jurisdictionCode, action);
    return true;
  } catch {
    return false;
  }
}
