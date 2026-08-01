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
  enabled: boolean;
  fee_type: string;
  fee_value: number | null;
  min_fee: number | null;
  max_fee: number | null;
  applies_to: Record<string, unknown> | null;
  effective_from: string | null;
  effective_until: string | null;
};

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
  const { data, error } = await admin
    .from("revenue_rules")
    .select("rule_key, enabled, fee_type, fee_value, min_fee, max_fee, applies_to, effective_from, effective_until")
    .eq("enabled", true);

  if (error) {
    throw new HttpError(500, "Unable to load platform fees");
  }

  let platformFeeMinor = 0;
  const breakdown: Array<{ rule_key: string; amount_minor: number }> = [];

  for (const row of (data || []) as RevenueRuleRow[]) {
    if (!isRuleEffective(row)) continue;

    if (row.rule_key === "transaction_fee") {
      const feeMinor = calculateRuleFeeMinor(row, input.baseMinor);
      platformFeeMinor += feeMinor;
      breakdown.push({ rule_key: row.rule_key, amount_minor: feeMinor });
      continue;
    }

    if (row.rule_key === "booking_guest_fee" && input.purpose === "booking_fee") {
      const feeMinor = calculateRuleFeeMinor(row, input.baseMinor);
      platformFeeMinor += feeMinor;
      breakdown.push({ rule_key: row.rule_key, amount_minor: feeMinor });
    }
  }

  return { platformFeeMinor, breakdown };
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
  const { platformFeeMinor, breakdown } = await loadCheckoutFees(admin, {
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
    discountMinor,
    totalMinor,
    feeBreakdown: breakdown,
    promo,
  };
}
