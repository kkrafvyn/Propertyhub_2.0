import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type RevenueRuleRow = {
  rule_key: string;
  enabled: boolean;
  fee_type: string;
  fee_value: number | null;
};

export function calculateFeeMinorFromRule(rule: RevenueRuleRow, baseMinor: number) {
  if (!rule.enabled) return 0;
  const feeValue = Number(rule.fee_value || 0);
  let feeMinor =
    rule.fee_type === "percentage"
      ? Math.round(baseMinor * (feeValue / 100))
      : Math.round(feeValue * 100);
  return Math.max(0, feeMinor);
}

export async function loadTransactionFeePercent(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("revenue_rules")
    .select("rule_key, enabled, fee_type, fee_value")
    .eq("rule_key", "transaction_fee")
    .maybeSingle();

  if (error || !data?.enabled || data.fee_type !== "percentage") {
    return 0;
  }

  return Number(data.fee_value || 0);
}

export function resolvePlatformFeeMinorFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  grossMinor: number,
) {
  const fromMeta = Number(metadata?.platformFeeMinor);
  if (Number.isFinite(fromMeta) && fromMeta >= 0) {
    return fromMeta;
  }
  return null;
}

export function resolveBaseAmountMinorFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  grossMinor: number,
) {
  const fromMeta = Number(metadata?.baseAmountMinor);
  if (Number.isFinite(fromMeta) && fromMeta > 0) {
    return fromMeta;
  }
  return null;
}

export async function resolveOrganizationCreditMinor(
  admin: SupabaseClient,
  input: {
    amountMinor: number;
    purpose: string;
    metadata: Record<string, unknown> | null | undefined;
  },
) {
  const providerFeeMeta = Number(input.metadata?.providerPlatformFeeMinor);
  const providerFee =
    Number.isFinite(providerFeeMeta) && providerFeeMeta > 0 ? providerFeeMeta : 0;

  const baseFromMeta = resolveBaseAmountMinorFromMetadata(input.metadata, input.amountMinor);
  if (baseFromMeta != null) {
    // Seller/landlord-charged BaytMiftah fee is withheld from provider proceeds.
    return Math.max(0, baseFromMeta - providerFee);
  }

  const feeFromMeta = resolvePlatformFeeMinorFromMetadata(input.metadata, input.amountMinor);
  if (feeFromMeta != null) {
    return Math.max(0, input.amountMinor - feeFromMeta - providerFee);
  }

  const feePercent = await loadTransactionFeePercent(admin);
  if (feePercent <= 0 && providerFee <= 0) {
    return input.amountMinor;
  }

  const estimatedBase = Math.round(input.amountMinor / (1 + feePercent / 100));
  const { loadCheckoutFees } = await import("./promo-pricing.ts");
  const fees = await loadCheckoutFees(admin, {
    purpose: input.purpose,
    baseMinor: estimatedBase,
  });

  return Math.max(
    0,
    input.amountMinor - fees.platformFeeMinor - (fees.providerPlatformFeeMinor || 0),
  );
}
