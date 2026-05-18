import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260516162000_multi_gateway_property_payments.sql"),
  "utf8"
);
const gatewayAdapter = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/payment-gateways.ts"),
  "utf8"
);
const paymentService = readFileSync(join(process.cwd(), "src/lib/payment.service.ts"), "utf8");
const deploymentScript = readFileSync(
  join(process.cwd(), "scripts/deploySupabasePayments.cjs"),
  "utf8"
);

describe("multi-gateway property payments", () => {
  it("allows the supported checkout providers in the payment ledger", () => {
    expect(migrationSql).toContain("'paystack', 'flutterwave', 'it_consortium'");
    expect(migrationSql).toContain("idx_property_transactions_provider_status_created_at");
  });

  it("routes checkout and verification through generic payment functions", () => {
    expect(paymentService).toContain('invoke("initialize-property-payment"');
    expect(paymentService).toContain('invoke("verify-property-payment"');
    expect(paymentService).toContain("PaymentGatewayProvider");
  });

  it("keeps provider-specific adapters server side", () => {
    expect(gatewayAdapter).toContain("initializePaystackTransaction");
    expect(gatewayAdapter).toContain("initializeStripePayment");
    expect(gatewayAdapter).toContain("/v3/payments");
    expect(gatewayAdapter).toContain("verify_by_reference");
    expect(gatewayAdapter).toContain("IT_CONSORTIUM_MERCHANT_ID");
  });

  it("deploys the new functions and webhook handlers", () => {
    expect(deploymentScript).toContain("initialize-property-payment");
    expect(deploymentScript).toContain("verify-property-payment");
    expect(deploymentScript).toContain("payment-webhook");
    expect(deploymentScript).toContain("flutterwave-webhook");
    expect(deploymentScript).toContain("paystack-webhook");
  });
});
