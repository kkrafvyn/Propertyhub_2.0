import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260516162000_multi_gateway_property_payments.sql"),
  "utf8"
);
const unifiedProcessorMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260518153224_unify_payment_processors.sql"),
  "utf8"
);
const gatewayAdapter = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/payment-gateways.ts"),
  "utf8"
);
const subscriptionFunction = readFileSync(
  join(process.cwd(), "supabase/functions/initialize-organization-subscription/index.ts"),
  "utf8"
);
const verifySubscriptionFunction = readFileSync(
  join(process.cwd(), "supabase/functions/verify-organization-subscription/index.ts"),
  "utf8"
);
const subscriptionReconciliation = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/organization-subscription-reconciliation.ts"),
  "utf8"
);
const initializePropertyPayment = readFileSync(
  join(process.cwd(), "supabase/functions/initialize-property-payment/index.ts"),
  "utf8"
);
const paymentWebhook = readFileSync(
  join(process.cwd(), "supabase/functions/payment-webhook/index.ts"),
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
    expect(unifiedProcessorMigration).toContain("'paystack', 'stripe', 'flutterwave'");
    expect(unifiedProcessorMigration).toContain("property_refunds_provider_check");
    expect(unifiedProcessorMigration).toContain("property_escrows_payment_processor_check");
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
    expect(gatewayAdapter).toContain("createFlutterwaveRefund");
    expect(gatewayAdapter).toContain("/v3/transfers");
    expect(gatewayAdapter).toContain("IT_CONSORTIUM_MERCHANT_ID");
  });

  it("falls back across configured gateways when checkout initialization fails", () => {
    expect(gatewayAdapter).toContain("getPaymentGatewayFallbackOrder");
    expect(gatewayAdapter).toContain("isPaymentGatewayConfigured");
    expect(initializePropertyPayment).toContain("fallbackProviders");
    expect(initializePropertyPayment).toContain("allowGatewayFallback");
    expect(initializePropertyPayment).toContain("gatewayFallbackAttempts");
    expect(initializePropertyPayment).toContain("fallbackAttempted");
    expect(paymentService).toContain("allowGatewayFallback");
    expect(paymentService).toContain("Falls back to Paystack");
  });

  it("keeps release and refund jobs provider-neutral with Paystack as the live fallback", () => {
    expect(unifiedProcessorMigration).toContain("processor_transfer_reference");
    expect(unifiedProcessorMigration).toContain("processor_refund_reference");
    expect(gatewayAdapter).toContain("FLUTTERWAVE_SECRET_KEY");
    expect(gatewayAdapter).toContain("STRIPE_SECRET_KEY");
    expect(gatewayAdapter).toContain("PAYSTACK_SECRET_KEY");
    expect(paymentWebhook).toContain("verifyFlutterwaveWebhookSignature");
    expect(paymentWebhook).toContain('provider: "flutterwave"');
  });

  it("uses the same provider fallback model for workspace subscription checkout", () => {
    expect(subscriptionFunction).toContain("selectSubscriptionCheckoutProvider");
    expect(subscriptionFunction).toContain("requestedBillingProvider");
    expect(subscriptionFunction).toContain("providerFallbackAttempts");
    expect(subscriptionFunction).toContain("FLUTTERWAVE_PLAN_ID_");
    expect(gatewayAdapter).toContain("initializeFlutterwaveSubscriptionPayment");
    expect(verifySubscriptionFunction).toContain(
      "reconcileFlutterwaveOrganizationSubscriptionPayment"
    );
    expect(subscriptionReconciliation).toContain(
      "reconcileFlutterwaveOrganizationSubscriptionPayment"
    );
    expect(paymentWebhook).toContain("reconcileFlutterwaveOrganizationSubscriptionPayment");
  });

  it("deploys the new functions and webhook handlers", () => {
    expect(deploymentScript).toContain("initialize-property-payment");
    expect(deploymentScript).toContain("verify-property-payment");
    expect(deploymentScript).toContain("payment-webhook");
    expect(deploymentScript).toContain("flutterwave-webhook");
    expect(deploymentScript).toContain("paystack-webhook");
  });
});
