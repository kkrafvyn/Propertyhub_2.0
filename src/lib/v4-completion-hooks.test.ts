import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const completionMigration = read("supabase/migrations/20260517171523_v4_completion_hooks.sql");
const publicKeyFunction = read("supabase/functions/public-verification-key/index.ts");
const anchorFunction = read("supabase/functions/anchor-integrity-audit/index.ts");
const smartAccessFunction = read("supabase/functions/manage-smart-access/index.ts");
const smartAccessProvider = read("supabase/functions/_shared/iot-provider-service.ts");
const smartAccessService = read("src/lib/smart-access.service.ts");
const escrowService = read("src/lib/escrow.service.ts");
const workspaceSmartAccess = read("src/app/pages/workspace/WorkspaceSmartAccess.tsx");
const workspaceDashboard = read("src/app/pages/workspace/WorkspaceDashboard.tsx");
const workspaceSettings = read("src/app/pages/workspace/WorkspaceSettings.tsx");
const publicReceipt = read("src/app/pages/PublicVerificationReceipt.tsx");
const paymentReconciliation = read("supabase/functions/_shared/payment-reconciliation.ts");
const envExample = read(".env.example");
const deployScript = read("scripts/deploySupabasePayments.cjs");
const statusDoc = read("docs/reference/baytmiftah-v4-checklist-status.md");

describe("BaytMiftah v4 completion hooks", () => {
  it("adds payout setup, private condition photos, command audit, and receipt HTML schema", () => {
    expect(completionMigration).toContain("payment_setup_status");
    expect(completionMigration).toContain("flutterwave_subaccount_id");
    expect(completionMigration).toContain("receipt_html");
    expect(completionMigration).toContain("receipt_pdf_status");
    expect(completionMigration).toContain("photo_storage_paths");
    expect(completionMigration).toContain("condition-report-media");
    expect(completionMigration).toContain("CREATE TABLE IF NOT EXISTS public.property_iot_command_events");
    expect(completionMigration).toContain("ALTER TABLE public.property_iot_command_events ENABLE ROW LEVEL SECURITY");
    expect(completionMigration).toContain("reject_property_iot_command_event_mutation");
  });

  it("publishes verification keys and scheduled trust anchors through Edge Functions", () => {
    expect(publicKeyFunction).toContain("AUDIT_RSA_PUBLIC_KEY_PEM");
    expect(publicKeyFunction).toContain("RSA-PSS-SHA256");
    expect(anchorFunction).toContain("ANCHOR_JOB_SECRET");
    expect(anchorFunction).toContain("GITHUB_ANCHOR_REPO");
    expect(anchorFunction).toContain("integrity_anchors");
    expect(deployScript).toContain("public-verification-key");
    expect(deployScript).toContain("anchor-integrity-audit");
  });

  it("routes Smart Property Access provider commands through a server-side abstraction", () => {
    expect(smartAccessProvider).toContain("sendSmartAccessProviderCommand");
    expect(smartAccessProvider).toContain("${prefix}_COMMAND_ENDPOINT");
    expect(envExample).toContain("TTLOCK_COMMAND_ENDPOINT=");
    expect(envExample).toContain("YALE_COMMAND_ENDPOINT=");
    expect(envExample).toContain("TUYA_COMMAND_ENDPOINT=");
    expect(smartAccessFunction).toContain("generate_viewing_code");
    expect(smartAccessFunction).toContain("sync_device_health");
    expect(smartAccessFunction).toContain("property_iot_command_events");
    expect(smartAccessService).toContain("generateViewingCode");
    expect(smartAccessService).toContain("syncDeviceHealth");
    expect(workspaceSmartAccess).toContain("Generate Code");
    expect(workspaceSmartAccess).toContain("Sync");
  });

  it("adds guided onboarding, payout setup UI, private photo uploads, and printable receipts", () => {
    expect(workspaceDashboard).toContain("Agency onboarding checklist");
    expect(workspaceDashboard).toContain("Set payout destination");
    expect(workspaceSettings).toContain("Payment & Payout Setup");
    expect(workspaceSettings).toContain("paystack_transfer_recipient_code");
    expect(escrowService).toContain("VITE_CONDITION_REPORT_MEDIA_BUCKET");
    expect(escrowService).toContain("photo_storage_paths");
    expect(publicReceipt).toContain("Print / Save PDF");
    expect(paymentReconciliation).toContain("buildReceiptHtml");
    expect(paymentReconciliation).toContain("verification_pdf_url");
  });

  it("documents the remaining production-only activation work", () => {
    expect(envExample).toContain("AUDIT_RSA_PUBLIC_KEY_PEM=");
    expect(envExample).toContain("ANCHOR_JOB_SECRET=");
    expect(envExample).toContain("TTLOCK_COMMAND_ENDPOINT=");
    expect(statusDoc).toContain("Provider credentials");
    expect(statusDoc).toContain("Scheduled anchoring");
  });

  it("keeps removed distributed-ledger terms out of this completion slice", () => {
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
      completionMigration,
      publicKeyFunction,
      anchorFunction,
      smartAccessFunction,
      smartAccessProvider,
      smartAccessService,
      escrowService,
      statusDoc,
    ]) {
      for (const term of forbiddenTerms) {
        expect(text.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});
