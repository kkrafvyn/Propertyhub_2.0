/**
 * Pay Angels sandbox payment flow contract (pay → webhook → ledger).
 * Live sandbox calls are skipped unless PAYANGELS_SANDBOX_WEBHOOK_SECRET is configured.
 */

export function calculatePlatformFeeMinor(amountMinor: number, feePercent = 1.5) {
  return Math.max(0, Math.round(amountMinor * (feePercent / 100)));
}

export function calculateNetCreditMinor(amountMinor: number, feePercent = 1.5) {
  return amountMinor - calculatePlatformFeeMinor(amountMinor, feePercent);
}

export type PayangelsWebhookEvent = {
  event: string;
  data: {
    id?: number | string;
    reference?: string;
    amount?: number;
    status?: string;
  };
};

export type PaymentLedgerProjection = {
  transactionStatus: "pending" | "success" | "failed";
  grossMinor: number;
  platformFeeMinor: number;
  orgWalletCreditMinor: number;
  ledgerReferenceType: "property_transaction";
};

export function projectPaymentLedgerAfterWebhook(input: {
  reference: string;
  amountMinor: number;
  webhook: PayangelsWebhookEvent;
  platformFeeMinor?: number;
  feePercent?: number;
}): PaymentLedgerProjection {
  const success = input.webhook.event === "charge.success";
  const grossMinor = input.amountMinor;
  const platformFeeMinor =
    input.platformFeeMinor ??
    calculatePlatformFeeMinor(grossMinor, input.feePercent ?? 1.5);
  const orgWalletCreditMinor = success ? grossMinor - platformFeeMinor : 0;

  return {
    transactionStatus: success ? "success" : "failed",
    grossMinor,
    platformFeeMinor,
    orgWalletCreditMinor,
    ledgerReferenceType: "property_transaction",
  };
}

export function buildChargeSuccessWebhook(reference: string, amountMajor: number): PayangelsWebhookEvent {
  return {
    event: "charge.success",
    data: {
      id: `evt_${reference}`,
      reference,
      amount: amountMajor,
      status: "success",
    },
  };
}
