import { HttpError } from "./http.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type PromoValidation = {
  valid: true;
  code: string;
  label: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_minor: number;
  promo_id: string;
};

type RevenueRuleRow = {
  rule_key: string;
  category?: string | null;
  enabled: boolean;
  fee_type: string;
  fee_value: number | null;
  min_fee: number | null;
  max_fee: number | null;
  applies_to: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  effective_from: string | null;
  effective_until: string | null;
};

type ChargedTo = "buyer" | "seller" | "landlord" | "guest" | "host" | "lister";

const BUYER_CHARGED: ChargedTo[] = ["buyer", "guest"];
const PROVIDER_CHARGED: ChargedTo[] = ["seller", "landlord", "host", "lister"];

function isRuleEffective(rule: RevenueRuleRow, at = new Date()) {
  if (!rule.enabled) return false;
  if (rule.effective_from && new Date(rule.effective_from) > at) return false;
  if (rule.effective_until && new Date(rule.effective_until) < at) return false;
  return true;
}

function calculateRuleFeeMinor(rule: RevenueRuleRow, baseMinor: number) {
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

function normalizePurpose(purpose: string) {
  return String(purpose || "other").trim().toLowerCase().replace(/\s+/g, "_");
}

function getChargedTo(rule: RevenueRuleRow): ChargedTo {
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
  if (rule.rule_key.includes("rent")) return "landlord";
  return "seller";
}

function getTier(rule: RevenueRuleRow) {
  const tier = rule.metadata?.tier;
  return typeof tier === "string" ? tier.trim().toLowerCase() : "";
}

function ruleMatchesPurpose(rule: RevenueRuleRow, purpose: string) {
  const purposes = Array.isArray(rule.applies_to?.purposes)
    ? (rule.applies_to!.purposes as unknown[]).map((p) => String(p).toLowerCase())
    : [];
  if (!purposes.length) return false;
  return purposes.includes(normalizePurpose(purpose));
}

function pickTier(candidates: RevenueRuleRow[], activeTier: string) {
  const tier = String(activeTier || "founding").toLowerCase();
  const matched = candidates.filter((rule) => getTier(rule) === tier);
  if (matched.length) return matched;
  const untiered = candidates.filter((rule) => !getTier(rule));
  return untiered.length ? untiered : candidates;
}

function selectRules(rules: RevenueRuleRow[], purpose: string, activeTier: string) {
  const effective = rules.filter((rule) => isRuleEffective(rule));
  const purposeMatched = effective.filter(
    (rule) =>
      (rule.category === "platform_fees" || rule.rule_key.startsWith("platform_fee_")) &&
      ruleMatchesPurpose(rule, purpose),
  );

  if (purposeMatched.length) {
    const buyer = pickTier(
      purposeMatched.filter((r) => BUYER_CHARGED.includes(getChargedTo(r))),
      activeTier,
    );
    const provider = pickTier(
      purposeMatched.filter((r) => PROVIDER_CHARGED.includes(getChargedTo(r))),
      activeTier,
    );
    const picked: RevenueRuleRow[] = [];
    if (buyer[0]) picked.push(buyer[0]);
    if (provider[0]) picked.push(provider[0]);
    return picked;
  }

  if (normalizePurpose(purpose) === "booking_fee") {
    const guest = effective.find((rule) => rule.rule_key === "booking_guest_fee");
    if (guest) return [guest];
  }

  const legacy = effective.find((rule) => rule.rule_key === "transaction_fee");
  return legacy ? [legacy] : [];
}

export async function validatePromoCode(
  admin: SupabaseClient,
  code: string,
  purpose: string,
  amountMinor: number,
): Promise<PromoValidation> {
  const { data, error } = await admin.rpc("validate_promo_code", {
    p_code: code,
    p_purpose: purpose,
    p_amount_minor: amountMinor,
  });

  if (error) {
    throw new HttpError(500, "Unable to validate promo code");
  }

  if (!data?.valid) {
    throw new HttpError(400, String(data?.error || "Invalid promo code"));
  }

  return data as PromoValidation;
}

export async function loadCheckoutFees(
  admin: SupabaseClient,
  input: { purpose: string; baseMinor: number },
) {
  const [{ data, error }, settingsResult] = await Promise.all([
    admin
      .from("revenue_rules")
      .select(
        "rule_key, category, enabled, fee_type, fee_value, min_fee, max_fee, applies_to, metadata, effective_from, effective_until",
      )
      .eq("enabled", true),
    admin.from("platform_settings").select("key, value").in("key", [
      "active_pricing_tier",
      "platform_fee_display_name",
      "platform_fees_enabled",
      "checkout_taxes_enabled",
      "vat_enabled",
    ]),
  ]);

  if (error) {
    throw new HttpError(500, "Unable to load platform fees");
  }

  const settingsRows = settingsResult.data || [];
  const settings: Record<string, unknown> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  const activeTier = String(settings.active_pricing_tier || "founding").replace(/"/g, "");
  const feeDisplayName = String(settings.platform_fee_display_name || "BaytMiftah platform fee")
    .replace(/^"/, "")
    .replace(/"$/, "");

  const feesEnabled = !["false", "0", "off", "no"].includes(
    String(settings.platform_fees_enabled ?? "true").replace(/"/g, "").toLowerCase(),
  );
  const checkoutTaxesEnabled = !["false", "0", "off", "no"].includes(
    String(settings.checkout_taxes_enabled ?? "true").replace(/"/g, "").toLowerCase(),
  );
  const vatEnabled = !["false", "0", "off", "no"].includes(
    String(settings.vat_enabled ?? "true").replace(/"/g, "").toLowerCase(),
  );
  const taxesEnabled = checkoutTaxesEnabled && vatEnabled;

  if (!feesEnabled) {
    return {
      platformFeeMinor: 0,
      buyerPlatformFeeMinor: 0,
      providerPlatformFeeMinor: 0,
      breakdown: [],
      feeDisplayName,
      feesEnabled: false,
      taxesEnabled,
    };
  }

  const selected = selectRules((data || []) as RevenueRuleRow[], input.purpose, activeTier);
  let buyerPlatformFeeMinor = 0;
  let providerPlatformFeeMinor = 0;
  const breakdown: Array<{ rule_key: string; amount_minor: number; charged_to: string }> = [];

  for (const row of selected) {
    const feeMinor = calculateRuleFeeMinor(row, input.baseMinor);
    const chargedTo = getChargedTo(row);
    breakdown.push({ rule_key: row.rule_key, amount_minor: feeMinor, charged_to: chargedTo });
    if (BUYER_CHARGED.includes(chargedTo)) buyerPlatformFeeMinor += feeMinor;
    else providerPlatformFeeMinor += feeMinor;
  }

  return {
    platformFeeMinor: buyerPlatformFeeMinor,
    buyerPlatformFeeMinor,
    providerPlatformFeeMinor,
    breakdown,
    feeDisplayName,
    feesEnabled: true,
    taxesEnabled,
  };
}

export async function redeemPromoCode(admin: SupabaseClient, code: string) {
  const normalized = code.trim().toUpperCase();
  const { data: promo, error: fetchError } = await admin
    .from("promo_codes")
    .select("id, code, uses_count, max_uses, is_active")
    .ilike("code", normalized)
    .maybeSingle();

  if (fetchError || !promo?.is_active) return false;
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) return false;

  const { error: updateError } = await admin
    .from("promo_codes")
    .update({
      uses_count: Number(promo.uses_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promo.id);

  return !updateError;
}

/** Pilot scope: tax is display-only in the client; server charges base + buyer platform fees − promo only. */
export async function resolveCheckoutAmountMinor(
  admin: SupabaseClient,
  input: {
    listing: { price?: number | null };
    purpose: string;
    promoCode?: string | null;
    clientAmountMinor?: number | null;
  },
) {
  const listingPrice = Number(input.listing.price || 0);
  if (!Number.isFinite(listingPrice) || listingPrice <= 0) {
    throw new HttpError(400, "Listing price is not configured");
  }

  const baseMinor = Math.round(listingPrice * 100);
  const {
    platformFeeMinor,
    buyerPlatformFeeMinor,
    providerPlatformFeeMinor,
    breakdown,
    feeDisplayName,
  } = await loadCheckoutFees(admin, {
    purpose: input.purpose,
    baseMinor,
  });

  const subtotalMinor = baseMinor + platformFeeMinor;
  let discountMinor = 0;
  let promo: PromoValidation | null = null;

  if (input.promoCode?.trim()) {
    promo = await validatePromoCode(admin, input.promoCode, input.purpose, subtotalMinor);
    discountMinor = promo.discount_minor;
  }

  const totalMinor = Math.max(0, subtotalMinor - discountMinor);

  if (input.clientAmountMinor != null && input.clientAmountMinor > 0) {
    const tolerance = Math.max(100, Math.round(totalMinor * 0.01));
    if (Math.abs(input.clientAmountMinor - totalMinor) > tolerance) {
      throw new HttpError(400, "Payment amount does not match checkout total");
    }
  }

  return {
    baseMinor,
    platformFeeMinor,
    buyerPlatformFeeMinor,
    providerPlatformFeeMinor,
    discountMinor,
    totalMinor,
    feeBreakdown: breakdown,
    feeDisplayName,
    promo,
  };
}
