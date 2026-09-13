import { describe, expect, it } from "vitest";
import {
  calculateProcessingFeeMinor,
  calculateRuleFeeMinor,
  coerceSettingBoolean,
  resolveFeeAndTaxEnabled,
  resolvePlatformFees,
  selectPlatformFeeRules,
  type PlatformFeeRuleLike,
} from "./platform-fee-schedule";

const saleFounding: PlatformFeeRuleLike = {
  rule_key: "platform_fee_sale",
  category: "platform_fees",
  enabled: true,
  fee_type: "percentage",
  fee_value: 1,
  applies_to: { purposes: ["sale", "purchase"], charged_to: "seller" },
  metadata: { tier: "founding", fee_name: "BaytMiftah platform fee" },
};

const saleStandard: PlatformFeeRuleLike = {
  rule_key: "platform_fee_sale_standard",
  category: "platform_fees",
  enabled: true,
  fee_type: "percentage",
  fee_value: 1.5,
  applies_to: { purposes: ["sale", "purchase"], charged_to: "seller" },
  metadata: { tier: "standard", fee_name: "BaytMiftah platform fee" },
};

const buyerZero: PlatformFeeRuleLike = {
  rule_key: "platform_fee_buyer_sale",
  category: "platform_fees",
  enabled: true,
  fee_type: "percentage",
  fee_value: 0,
  applies_to: { purposes: ["sale", "purchase"], charged_to: "buyer" },
  metadata: { tier: "standard" },
};

const rentFee: PlatformFeeRuleLike = {
  rule_key: "platform_fee_rent",
  category: "platform_fees",
  enabled: true,
  fee_type: "percentage",
  fee_value: 2,
  applies_to: { purposes: ["rent", "lease_fee"], charged_to: "landlord" },
  metadata: { tier: "standard" },
};

const legacy: PlatformFeeRuleLike = {
  rule_key: "transaction_fee",
  category: "transaction_fees",
  enabled: true,
  fee_type: "percentage",
  fee_value: 1.5,
  applies_to: {},
};

describe("platform fee schedule", () => {
  it("selects founding seller fee for sales when founding tier is active", () => {
    const selected = selectPlatformFeeRules(
      [saleFounding, saleStandard, buyerZero],
      "sale",
      "founding",
    );
    expect(selected.map((r) => r.rule_key).sort()).toEqual([
      "platform_fee_buyer_sale",
      "platform_fee_sale",
    ]);
  });

  it("selects standard seller fee when standard tier is active", () => {
    const selected = selectPlatformFeeRules(
      [saleFounding, saleStandard, buyerZero],
      "purchase",
      "standard",
    );
    expect(selected.some((r) => r.rule_key === "platform_fee_sale_standard")).toBe(true);
    expect(selected.some((r) => r.rule_key === "platform_fee_sale")).toBe(false);
  });

  it("splits buyer vs provider fees so seller-charged fee is not in checkout total", () => {
    const resolved = resolvePlatformFees({
      rules: [saleFounding, buyerZero],
      purpose: "sale",
      baseMinor: 100_000_000, // GH₵1,000,000
      activeTier: "founding",
    });
    expect(resolved.buyerPlatformFeeMinor).toBe(0);
    expect(resolved.platformFeeMinor).toBe(0);
    expect(resolved.providerPlatformFeeMinor).toBe(1_000_000); // 1%
  });

  it("adds buyer-charged fee into checkout platformFeeMinor when admin flips charged_to", () => {
    const buyerCharged: PlatformFeeRuleLike = {
      ...saleFounding,
      rule_key: "platform_fee_sale_buyer",
      applies_to: { purposes: ["sale"], charged_to: "buyer" },
      fee_value: 1.5,
    };
    const resolved = resolvePlatformFees({
      rules: [buyerCharged],
      purpose: "sale",
      baseMinor: 100_000_000,
      activeTier: "founding",
    });
    expect(resolved.platformFeeMinor).toBe(1_500_000);
    expect(resolved.providerPlatformFeeMinor).toBe(0);
  });

  it("applies 2% rental fee to landlord", () => {
    const resolved = resolvePlatformFees({
      rules: [rentFee],
      purpose: "rent",
      baseMinor: 500_000, // GH₵5,000
      activeTier: "standard",
    });
    expect(resolved.providerPlatformFeeMinor).toBe(10_000); // GH₵100
    expect(resolved.platformFeeMinor).toBe(0);
  });

  it("falls back to legacy transaction_fee when no purpose rule matches", () => {
    const selected = selectPlatformFeeRules([legacy, rentFee], "other", "founding");
    expect(selected.map((r) => r.rule_key)).toEqual(["transaction_fee"]);
    expect(calculateRuleFeeMinor(legacy, 10_000_00)).toBe(15_000);
  });

  it("keeps PayAngels processing fee calculation separate", () => {
    expect(
      calculateProcessingFeeMinor({
        gatewayFeeType: "percentage",
        gatewayFeeValue: 1.5,
        chargeBaseMinor: 100_000,
      }),
    ).toBe(1_500);
    expect(
      calculateProcessingFeeMinor({
        gatewayFeeType: "fixed",
        gatewayFeeValue: 5,
        chargeBaseMinor: 100_000,
      }),
    ).toBe(500);
  });
});

describe("fee and tax master toggles", () => {
  it("coerces platform_settings string/boolean values", () => {
    expect(coerceSettingBoolean(true)).toBe(true);
    expect(coerceSettingBoolean("false")).toBe(false);
    expect(coerceSettingBoolean('"false"')).toBe(false);
    expect(coerceSettingBoolean(undefined, true)).toBe(true);
  });

  it("disables fees when platform master is off", () => {
    const gates = resolveFeeAndTaxEnabled({
      platformFeesEnabled: false,
      checkoutTaxesEnabled: true,
      vatEnabled: true,
      orgCollectPlatformFees: true,
      orgCollectCheckoutTaxes: true,
    });
    expect(gates.feesEnabled).toBe(false);
    expect(gates.taxesEnabled).toBe(true);
  });

  it("disables taxes when checkout taxes master or VAT is off", () => {
    expect(
      resolveFeeAndTaxEnabled({
        platformFeesEnabled: true,
        checkoutTaxesEnabled: false,
        vatEnabled: true,
      }).taxesEnabled,
    ).toBe(false);
    expect(
      resolveFeeAndTaxEnabled({
        platformFeesEnabled: true,
        checkoutTaxesEnabled: true,
        vatEnabled: false,
      }).taxesEnabled,
    ).toBe(false);
  });

  it("lets an org turn off fees/taxes even when platform masters are on", () => {
    const gates = resolveFeeAndTaxEnabled({
      platformFeesEnabled: true,
      checkoutTaxesEnabled: true,
      vatEnabled: true,
      orgCollectPlatformFees: false,
      orgCollectCheckoutTaxes: false,
    });
    expect(gates.feesEnabled).toBe(false);
    expect(gates.taxesEnabled).toBe(false);
  });
});
