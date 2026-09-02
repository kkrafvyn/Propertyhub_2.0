import { describe, expect, it } from "vitest";
import { verifyPayangelsSignature } from "./payment-verification";
import {
  buildChargeSuccessWebhook,
  calculateNetCreditMinor,
  calculatePlatformFeeMinor,
  projectPaymentLedgerAfterWebhook,
} from "./payangels-ledger-contract";

const sandboxSecret = import.meta.env.PAYANGELS_SANDBOX_WEBHOOK_SECRET;
const sandboxReference = import.meta.env.PAYANGELS_SANDBOX_TEST_REFERENCE;
const hasSandbox = Boolean(sandboxSecret && sandboxReference);

async function createTestSignature(secret: string, payload: string) {
  const crypto = await import("node:crypto");
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

describe("Pay Angels sandbox E2E contract", () => {
  it("computes platform fee and org wallet credit for a successful charge", () => {
    const amountMinor = 250_00;
    expect(calculatePlatformFeeMinor(amountMinor)).toBe(375);
    expect(calculateNetCreditMinor(amountMinor)).toBe(246_25);
  });

  it("projects ledger state after charge.success webhook", () => {
    const reference = "payangels_ref_sandbox_001";
    const amountMinor = 10_000_00;
    const webhook = buildChargeSuccessWebhook(reference, amountMinor / 100);

    const projection = projectPaymentLedgerAfterWebhook({
      reference,
      amountMinor,
      webhook,
    });

    expect(projection.transactionStatus).toBe("success");
    expect(projection.grossMinor).toBe(amountMinor);
    expect(projection.orgWalletCreditMinor).toBe(calculateNetCreditMinor(amountMinor));
    expect(projection.ledgerReferenceType).toBe("property_transaction");
  });

  it("validates webhook HMAC before ledger reconciliation", async () => {
    const reference = "payangels_ref_hmac_check";
    const webhook = buildChargeSuccessWebhook(reference, 250);
    const payload = JSON.stringify(webhook);
    const secret = "payangels-sandbox-secret";
    const signature = `sha256=${await createTestSignature(secret, payload)}`;

    await expect(
      verifyPayangelsSignature({ payload, secret, signature }),
    ).resolves.toBe(true);
  });

  it.skipIf(!hasSandbox)("live sandbox reference reconciles to success ledger projection", async () => {
    const amountMinor = Number(import.meta.env.PAYANGELS_SANDBOX_AMOUNT_MINOR || 25000);
    const webhook = buildChargeSuccessWebhook(String(sandboxReference), amountMinor / 100);
    const payload = JSON.stringify(webhook);
    const signature = `sha256=${await createTestSignature(String(sandboxSecret), payload)}`;

    await expect(
      verifyPayangelsSignature({ payload, secret: String(sandboxSecret), signature }),
    ).resolves.toBe(true);

    const projection = projectPaymentLedgerAfterWebhook({
      reference: String(sandboxReference),
      amountMinor,
      webhook,
    });

    expect(projection.transactionStatus).toBe("success");
    expect(projection.orgWalletCreditMinor).toBeGreaterThan(0);
  });
});
