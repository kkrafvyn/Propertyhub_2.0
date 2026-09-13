/**
 * Pure helpers for BaytMiftah platform/service fee resolution.
 * Keep aligned with supabase/functions/_shared/promo-pricing.ts.
 */

export type PlatformFeeChargedTo =
  | "buyer"
  | "seller"
  | "landlord"
  | "guest"
  | "host"
  | "lister";

export type PlatformFeeRuleLike = {
  rule_key: string;
  category?: string;
  enabled: boolean;
  fee_type: string;
  fee_value: number | null;
  min_fee?: number | null;
  max_fee?: number | null;
  applies_to?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  effective_from?: string | null;
  effective_until?: string | null;
};

export type PlatformFeeBreakdownItem = {
  rule_key: string;
  amount_minor: number;
  charged_to: PlatformFeeChargedTo;
};

export type ResolvedPlatformFees = {
  buyerPlatformFeeMinor: number;
  providerPlatformFeeMinor: number;
  /** Buyer-charged fee only — included in checkout charge total. */
  platformFeeMinor: number;
  feeBreakdown: PlatformFeeBreakdownItem[];
  matchedRuleKeys: string[];
  feeDisplayName: string;
};

const BUYER_CHARGED: PlatformFeeChargedTo[] = ["buyer", "guest"];
const PROVIDER_CHARGED: PlatformFeeChargedTo[] = ["seller", "landlord", "host", "lister"];

export function isRuleEffective(rule: PlatformFeeRuleLike, at = new Date()) {
  if (!rule.enabled) return false;
  if (rule.effective_from && new Date(rule.effective_from) > at) return false;
  if (rule.effective_until && new Date(rule.effective_until) < at) return false;
  return true;
}

export function calculateRuleFeeMinor(rule: PlatformFeeRuleLike, baseMinor: number) {
  const feeValue = Number(rule.fee_value || 0);
  let feeMinor =
    rule.fee_type === "percentage"
      ? Math.round(baseMinor * (feeValue / 100))
      : Math.round(feeValue * 100);

  if (rule.min_fee != null) {
    feeMinor = Math.max(feeMinor, Math.round(Number(rule.min_fee) * 100));
  }
  if (rule.max_fee != null) {
    feeMinor = Math.min(feeMinor, Math.round(Number(rule.max_fee) * 100));
  }

  return Math.max(0, feeMinor);
}

export function normalizeCheckoutPurpose(purpose: string) {
  return String(purpose || "other")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function getRuleChargedTo(rule: PlatformFeeRuleLike): PlatformFeeChargedTo {
  const raw = String(rule.applies_to?.charged_to || "").toLowerCase();
  if (
    raw === "buyer" ||
    raw === "seller" ||
    raw === "landlord" ||
    raw === "guest" ||
    raw === "host" ||
    raw === "lister"
  ) {
    return raw;
  }
  if (rule.rule_key.includes("buyer") || rule.rule_key.includes("guest")) return "buyer";
  if (rule.rule_key.includes("host")) return "host";
  if (rule.rule_key.includes("rent")) return "landlord";
  return "seller";
}

export function getRuleTier(rule: PlatformFeeRuleLike): string[] {
  const tier = rule.metadata?.tier;
  if (typeof tier === "string" && tier.trim()) return [tier.trim().toLowerCase()];
  return [];
}

export function ruleMatchesPurpose(rule: PlatformFeeRuleLike, purpose: string) {
  const normalized = normalizeCheckoutPurpose(purpose);
  const purposes = Array.isArray(rule.applies_to?.purposes)
    ? (rule.applies_to!.purposes as unknown[]).map((p) => String(p).toLowerCase())
    : [];
  if (purposes.length === 0) return false;
  return purposes.includes(normalized);
}

function pickTierMatchedRules(
  candidates: PlatformFeeRuleLike[],
  activeTier: string,
): PlatformFeeRuleLike[] {
  const tier = String(activeTier || "founding").toLowerCase();
  const byTier = candidates.filter((rule) => getRuleTier(rule).includes(tier));
  if (byTier.length) return byTier;
  const untiered = candidates.filter((rule) => getRuleTier(rule).length === 0);
  if (untiered.length) return untiered;
  return candidates;
}

/**
 * Select platform fee rules for a checkout purpose.
 * Preference: purpose-matched platform_fees (tier-aware) → booking guest → legacy transaction_fee.
 */
export function selectPlatformFeeRules(
  rules: PlatformFeeRuleLike[],
  purpose: string,
  activeTier = "founding",
  at = new Date(),
): PlatformFeeRuleLike[] {
  const effective = rules.filter((rule) => isRuleEffective(rule, at));
  const purposeMatched = effective.filter(
    (rule) =>
      (rule.category === "platform_fees" || rule.rule_key.startsWith("platform_fee_")) &&
      ruleMatchesPurpose(rule, purpose),
  );

  if (purposeMatched.length) {
    // Split buyer-side vs provider-side so both can apply (e.g. 0% buyer + 1% seller).
    const buyerRules = pickTierMatchedRules(
      purposeMatched.filter((r) => BUYER_CHARGED.includes(getRuleChargedTo(r))),
      activeTier,
    );
    const providerRules = pickTierMatchedRules(
      purposeMatched.filter((r) => PROVIDER_CHARGED.includes(getRuleChargedTo(r))),
      activeTier,
    );
    // Deduplicate by charged_to group: take highest-priority (first by sort via input order).
    const picked: PlatformFeeRuleLike[] = [];
    if (buyerRules[0]) picked.push(buyerRules[0]);
    if (providerRules[0]) picked.push(providerRules[0]);
    // Also include any purpose match that is neither buyer nor provider labeled oddly
    for (const rule of purposeMatched) {
      const charged = getRuleChargedTo(rule);
      if (!BUYER_CHARGED.includes(charged) && !PROVIDER_CHARGED.includes(charged)) {
        picked.push(rule);
      }
    }
    return picked;
  }

  const normalized = normalizeCheckoutPurpose(purpose);
  if (normalized === "booking_fee") {
    const guest = effective.find((rule) => rule.rule_key === "booking_guest_fee");
    if (guest) return [guest];
  }

  const legacy = effective.find((rule) => rule.rule_key === "transaction_fee");
  return legacy ? [legacy] : [];
}

export function resolvePlatformFees(input: {
  rules: PlatformFeeRuleLike[];
  purpose: string;
  baseMinor: number;
  activeTier?: string;
  feeDisplayName?: string;
  at?: Date;
}): ResolvedPlatformFees {
  const selected = selectPlatformFeeRules(
    input.rules,
    input.purpose,
    input.activeTier || "founding",
    input.at,
  );

  let buyerPlatformFeeMinor = 0;
  let providerPlatformFeeMinor = 0;
  const feeBreakdown: PlatformFeeBreakdownItem[] = [];
  const matchedRuleKeys: string[] = [];

  for (const rule of selected) {
    const amount = calculateRuleFeeMinor(rule, input.baseMinor);
    const chargedTo = getRuleChargedTo(rule);
    matchedRuleKeys.push(rule.rule_key);
    feeBreakdown.push({
      rule_key: rule.rule_key,
      amount_minor: amount,
      charged_to: chargedTo,
    });

    if (BUYER_CHARGED.includes(chargedTo)) {
      buyerPlatformFeeMinor += amount;
    } else {
      providerPlatformFeeMinor += amount;
    }
  }

  return {
    buyerPlatformFeeMinor,
    providerPlatformFeeMinor,
    platformFeeMinor: buyerPlatformFeeMinor,
    feeBreakdown,
    matchedRuleKeys,
    feeDisplayName: input.feeDisplayName || "BaytMiftah platform fee",
  };
}

export function calculateProcessingFeeMinor(input: {
  gatewayFeeType?: string | null;
  gatewayFeeValue?: number | null;
  chargeBaseMinor: number;
}) {
  const value = Number(input.gatewayFeeValue || 0);
  if (!value) return 0;
  if (input.gatewayFeeType === "fixed") {
    return Math.max(0, Math.round(value * 100));
  }
  return Math.max(0, Math.round(input.chargeBaseMinor * (value / 100)));
}

/** Coerce platform_settings JSONB / string values to boolean. */
export function coerceSettingBoolean(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value)
    .trim()
    .replace(/^"+|"+$/g, "")
    .toLowerCase();
  if (["false", "0", "off", "no", "disabled"].includes(normalized)) return false;
  if (["true", "1", "on", "yes", "enabled"].includes(normalized)) return true;
  return fallback;
}

/**
 * Platform master switches AND org overrides.
 * Platform off always wins. Org can further disable fees/taxes for that company or landlord workspace.
 */
export function resolveFeeAndTaxEnabled(input: {
  platformFeesEnabled?: unknown;
  checkoutTaxesEnabled?: unknown;
  vatEnabled?: unknown;
  orgCollectPlatformFees?: boolean | null;
  orgCollectCheckoutTaxes?: boolean | null;
}) {
  const platformFeesOn = coerceSettingBoolean(input.platformFeesEnabled, true);
  const checkoutTaxesOn = coerceSettingBoolean(input.checkoutTaxesEnabled, true);
  const vatOn = coerceSettingBoolean(input.vatEnabled, true);
  const orgFeesOn = input.orgCollectPlatformFees !== false;
  const orgTaxesOn = input.orgCollectCheckoutTaxes !== false;

  return {
    feesEnabled: platformFeesOn && orgFeesOn,
    taxesEnabled: checkoutTaxesOn && vatOn && orgTaxesOn,
    platformFeesEnabled: platformFeesOn,
    checkoutTaxesEnabled: checkoutTaxesOn,
    vatEnabled: vatOn,
    orgCollectPlatformFees: orgFeesOn,
    orgCollectCheckoutTaxes: orgTaxesOn,
  };
}

export function emptyPlatformFees(feeDisplayName = "BaytMiftah platform fee"): ResolvedPlatformFees {
  return {
    buyerPlatformFeeMinor: 0,
    providerPlatformFeeMinor: 0,
    platformFeeMinor: 0,
    feeBreakdown: [],
    matchedRuleKeys: [],
    feeDisplayName,
  };
}
