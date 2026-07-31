import {
  revenueManagementService,
  type RevenueRule,
} from "./revenue-management.service";

export type FeeCalculationInput = {
  ruleKey: string;
  amountMajor: number;
  currency?: string;
  context?: Record<string, unknown>;
};

export type FeeCalculationResult = {
  enabled: boolean;
  feeMajor: number;
  feeType: RevenueRule["fee_type"] | null;
  currency: string;
  rule: RevenueRule | null;
};

function clampFee(fee: number, rule: RevenueRule | null) {
  if (!rule) return fee;
  let next = fee;
  if (rule.min_fee != null) next = Math.max(next, rule.min_fee);
  if (rule.max_fee != null) next = Math.min(next, rule.max_fee);
  return Math.round(next * 100) / 100;
}

export async function calculateRevenueFee(
  input: FeeCalculationInput,
): Promise<FeeCalculationResult> {
  const rule = await revenueManagementService.getRule(input.ruleKey);
  const currency = input.currency || rule?.currency || "GHS";

  if (!rule || !rule.enabled) {
    return { enabled: false, feeMajor: 0, feeType: null, currency, rule };
  }

  const amount = input.amountMajor;
  let feeMajor = 0;

  if (rule.fee_type === "percentage") {
    feeMajor = (amount * Number(rule.fee_value || 0)) / 100;
  } else if (rule.fee_type === "fixed") {
    feeMajor = Number(rule.fee_value || 0);
  } else if (rule.fee_type === "custom") {
    feeMajor = Number(rule.metadata?.custom_amount || rule.fee_value || 0);
  }

  return {
    enabled: true,
    feeMajor: clampFee(feeMajor, rule),
    feeType: rule.fee_type,
    currency,
    rule,
  };
}

export async function getPremiumListingPrice(currency = "GHS") {
  const result = await calculateRevenueFee({
    ruleKey: "premium_listing",
    amountMajor: 0,
    currency,
  });
  return result.enabled ? result.rule?.fee_value || 0 : 0;
}

export async function getTransactionFeePercent() {
  const rule = await revenueManagementService.getRule("transaction_fee");
  if (!rule?.enabled) return 0;
  return Number(rule.fee_value || 0);
}

export async function getBookingFees() {
  const [guest, host] = await Promise.all([
    revenueManagementService.getRule("booking_guest_fee"),
    revenueManagementService.getRule("booking_host_fee"),
  ]);
  return {
    guestFeePercent: guest?.enabled ? Number(guest.fee_value || 0) : 0,
    hostFeePercent: host?.enabled ? Number(host.fee_value || 0) : 0,
  };
}

export async function getGatewayFeePercent(gatewayKey: string) {
  const gateways = await revenueManagementService.listPaymentGateways();
  const gateway = gateways.find((item) => item.gateway_key === gatewayKey);
  if (!gateway?.enabled) return 0;
  if (gateway.fee_type === "percentage") return Number(gateway.fee_value || 0);
  return 0;
}

export async function getPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  const settings = await revenueManagementService.getSettings();
  const value = settings[key];
  if (value === undefined || value === null) return fallback;
  if (typeof fallback === "number") return Number(value) as T;
  if (typeof fallback === "boolean") return (value === true || value === "true") as T;
  if (typeof fallback === "string" && typeof value === "string") return value as T;
  return value as T;
}
