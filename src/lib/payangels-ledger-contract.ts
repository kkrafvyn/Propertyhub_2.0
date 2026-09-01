/**
 * Pay Angels sandbox payment flow contract (pay → webhook → ledger).
 * Live sandbox calls are skipped unless PAYANGELS_SANDBOX_WEBHOOK_SECRET is configured.
 */

export function calculatePlatformFeeMinor(amountMinor: number) {
  return Math.max(0, Math.round(amountMinor * 0.025));
}

export function calculateNetCreditMinor(amountMinor: number) {
  return amountMinor - calculatePlatformFeeMinor(amountMinor);
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
}): PaymentLedgerProjection {
  const success = input.webhook.event === "charge.success";
  const grossMinor = input.amountMinor;
  const platformFeeMinor = calculatePlatformFeeMinor(grossMinor);
  const orgWalletCreditMinor = success ? calculateNetCreditMinor(grossMinor) : 0;

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
