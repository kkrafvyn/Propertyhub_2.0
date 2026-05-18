import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const v4Migration = read("supabase/migrations/20260517161305_v4_webhooks_iot_receipts_foundation.sql");
const paymentWebhook = read("supabase/functions/payment-webhook/index.ts");
const initializeSubscription = read("supabase/functions/initialize-organization-subscription/index.ts");
const verifySubscription = read("supabase/functions/verify-organization-subscription/index.ts");
const stripeReconciliation = read("supabase/functions/_shared/stripe-reconciliation.ts");
const workspaceEntry = read("src/app/pages/workspace/WorkspaceEntry.tsx");
const routes = read("src/app/routes.tsx");
const publicReceipt = read("src/app/pages/PublicVerificationReceipt.tsx");
const diasporaPrice = read("src/app/components/DiasporaPrice.tsx");
const propertySearch = read("src/app/pages/PropertySearch.tsx");
const propertyDetail = read("src/app/pages/PropertyDetail.tsx");
const smartAccessService = read("src/lib/smart-access.service.ts");
const propertyViewingService = read("src/lib/property-viewing.service.ts");
const workspaceLayout = read("src/app/pages/workspace/WorkspaceLayout.tsx");
const workspaceSmartAccess = read("src/app/pages/workspace/WorkspaceSmartAccess.tsx");
const userDashboard = read("src/app/pages/user/Dashboard.tsx");
const deployScript = read("scripts/deploySupabasePayments.cjs");
const statusDoc = read("docs/reference/baytmiftah-v4-checklist-status.md");

describe("BaytMiftah v4 checklist completion", () => {
  it("adds signed webhook, public receipt, and smart access schemas with RLS", () => {
    for (const tableName of [
      "payment_webhook_events",
      "public_verification_receipts",
      "property_iot_provider_connections",
      "property_iot_devices",
      "property_iot_access_grants",
      "property_iot_access_events",
    ]) {
      expect(v4Migration).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(v4Migration).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    }

    expect(v4Migration).toContain("smart_access_status");
    expect(v4Migration).toContain("smart_access_grant_id");
    expect(v4Migration).toContain("UNIQUE (provider, provider_event_id)");
    expect(v4Migration).toContain("Anyone can read public verification receipts");
  });

  it("routes Paystack and Stripe webhooks through one signed idempotent endpoint", () => {
    expect(paymentWebhook).toContain("verifyPaystackWebhookSignature");
    expect(paymentWebhook).toContain("verifyStripeWebhookSignature");
    expect(paymentWebhook).toContain("beginWebhookEvent");
    expect(paymentWebhook).toContain("finishWebhookEvent");
    expect(paymentWebhook).toContain("checkout.session.completed");
    expect(paymentWebhook).toContain("invoice.payment_failed");
    expect(paymentWebhook).toContain("reconcileOrganizationSubscriptionPayment");
    expect(paymentWebhook).toContain("reconcileStripeCheckoutSession");
    expect(deployScript).toContain("payment-webhook");
  });

  it("connects diaspora subscription checkout and verification to Stripe", () => {
    expect(initializeSubscription).toContain("createSubscription");
    expect(initializeSubscription).toContain("STRIPE_PRICE_ID_");
    expect(initializeSubscription).toContain("provider");
    expect(initializeSubscription).toContain("currency");
    expect(verifySubscription).toContain("retrieveStripeCheckoutSession");
    expect(verifySubscription).toContain("reconcileStripeOrganizationSubscriptionCheckout");
    expect(stripeReconciliation).toContain("reconcileStripeInvoicePaid");
    expect(workspaceEntry).toContain("Billing lane");
    expect(workspaceEntry).toContain("diaspora-usd");
    expect(workspaceEntry).toContain("diaspora-gbp");
  });

  it("surfaces public receipts, multi-currency marketplace prices, and condition reports", () => {
    expect(routes).toContain('path: "verify/:token"');
    expect(publicReceipt).toContain("public_verification_receipts");
    expect(publicReceipt).toContain("payload_hash");
    expect(diasporaPrice).toContain("convertCurrency");
    expect(propertySearch).toContain("DiasporaPrice");
    expect(propertyDetail).toContain("DiasporaPrice");
    expect(userDashboard).toContain("watermarked_content_markdown");
    expect(userDashboard).toContain("handleSubmitTenantConditionReport");
    expect(userDashboard).toContain("handleAcknowledgeConditionReport");
  });

  it("wires Smart Property Access across workspace, user dashboard, and viewing confirmation", () => {
    expect(smartAccessService).toContain("queueViewingAccessHook");
    expect(smartAccessService).toContain("property_iot_access_grants");
    expect(smartAccessService).toContain("property_iot_devices");
    expect(propertyViewingService).toContain("smartAccessService.queueViewingAccessHook");
    expect(workspaceLayout).toContain("WorkspaceSmartAccess");
    expect(workspaceLayout).toContain("smart-access");
    expect(workspaceSmartAccess).toContain("Register a device");
    expect(workspaceSmartAccess).toContain("Access grants");
    expect(userDashboard).toContain('section === "access"');
    expect(userDashboard).toContain("renderSmartAccess");
    expect(statusDoc).toContain("Phase 4 Smart Property Access | Foundation complete locally");
  });

  it("keeps removed external-chain terms out of the newly added v4 slice", () => {
    const forbiddenTerms = [
      "block" + "chain",
      "Poly" + "gon",
      "Alch" + "emy",
      "Hard" + "hat",
      "smart " + "contract",
      "web" + "3",
      "US" + "DC",
    ];

    for (const text of [
      v4Migration,
      paymentWebhook,
      initializeSubscription,
      verifySubscription,
      publicReceipt,
      smartAccessService,
      workspaceSmartAccess,
      statusDoc,
    ]) {
      for (const term of forbiddenTerms) {
        expect(text.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});
