import { HttpError } from "./http.ts";
import { createPaystackRefund, createPaystackTransfer } from "./paystack.ts";
import { recordInitiatedPropertyRefund } from "./refund-reconciliation.ts";
import {
  createStripeCheckoutSession,
  createStripeRefund,
  createStripeTransfer,
} from "./stripe.ts";
import {
  initializeGatewayPayment,
  type PaymentGatewayProvider,
} from "./payment-gateways.ts";

export type PaymentProcessor = "paystack" | "stripe";

export function selectEscrowProcessor(currency?: string | null): PaymentProcessor {
  const normalized = (currency || "GHS").toUpperCase();
  return ["USD", "GBP", "EUR"].includes(normalized) ? "stripe" : "paystack";
}

export async function initiateEscrow(input: {
  provider: PaymentGatewayProvider;
  amountMinor: number;
  email: string;
  currency: string;
  reference: string;
  callbackUrl: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  return initializeGatewayPayment(input);
}

export async function createSubscription(input: {
  provider: PaymentProcessor;
  email: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
  tierName: string;
  stripePriceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (input.provider !== "stripe") {
    throw new HttpError(400, "Paystack subscriptions use the dedicated Paystack subscription flow");
  }

  if (!input.stripePriceId) {
    throw new HttpError(400, "A Stripe price ID is required for diaspora subscriptions");
  }

  const checkout = await createStripeCheckoutSession({
    mode: "subscription",
    amountMinor: 0,
    currency: "USD",
    reference: input.reference,
    customerEmail: input.email,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    productName: `BaytMiftah ${input.tierName}`,
    priceId: input.stripePriceId,
    metadata: input.metadata,
  });

  if (!checkout.url) {
    throw new HttpError(502, "Stripe did not return a checkout URL");
  }

  return {
    provider: "stripe" as const,
    authorizationUrl: checkout.url,
    reference: input.reference,
    providerTransactionId: checkout.id,
    raw: checkout as Record<string, unknown>,
  };
}

export async function releaseToAgency(input: {
  escrow: any;
  reference: string;
  reason: string;
}) {
  const processor = input.escrow.payment_processor || selectEscrowProcessor(input.escrow.currency);

  if (processor === "stripe") {
    const destination = input.escrow.organization?.stripe_connect_account_id;
    if (!destination) {
      throw new HttpError(400, "Organization is missing a Stripe Connect account for escrow release");
    }

    const transfer = await createStripeTransfer({
      amountMinor: input.escrow.release_amount_minor || input.escrow.amount_minor,
      currency: input.escrow.currency,
      destination,
      reference: input.reference,
      transferGroup: `escrow_${input.escrow.id}`,
      metadata: {
        escrowId: input.escrow.id,
        organizationId: input.escrow.organization_id,
      },
    });

    return {
      provider: "stripe" as const,
      reference: transfer.id,
      transferCode: transfer.id,
      raw: transfer as Record<string, unknown>,
    };
  }

  const recipient =
    input.escrow.organization?.paystack_transfer_recipient_code ||
    Deno.env.get("PAYSTACK_DEFAULT_ESCROW_RECIPIENT_CODE");

  if (!recipient) {
    throw new HttpError(
      400,
      "Organization is missing a Paystack transfer recipient code for escrow release"
    );
  }

  const transfer = await createPaystackTransfer({
    amount: input.escrow.release_amount_minor || input.escrow.amount_minor,
    currency: input.escrow.currency,
    recipient,
    reference: input.reference,
    reason: input.reason,
  });

  return {
    provider: "paystack" as const,
    reference: transfer.reference || input.reference,
    transferCode: transfer.transfer_code || null,
    raw: transfer as Record<string, unknown>,
  };
}

export async function refundBuyer(input: {
  admin: any;
  escrow: any;
  requestedByUserId: string;
  reason: string;
}) {
  const processor = input.escrow.payment_processor || selectEscrowProcessor(input.escrow.currency);

  if (processor === "stripe") {
    const refund = await createStripeRefund({
      paymentIntent: input.escrow.transaction?.stripe_payment_intent_id || null,
      charge: input.escrow.transaction?.stripe_charge_id || null,
      amountMinor: input.escrow.amount_minor,
      reason: input.reason,
      metadata: {
        escrowId: input.escrow.id,
        transactionId: input.escrow.transaction_id,
      },
    });

    const { data: refundRecord, error } = await input.admin
      .from("property_refunds")
      .insert({
        transaction_id: input.escrow.transaction_id,
        organization_id: input.escrow.organization_id,
        property_id: input.escrow.property_id,
        requested_by_user_id: input.requestedByUserId,
        provider: "stripe",
        provider_refund_id: refund.id,
        provider_refund_reference: refund.id,
        amount_minor: refund.amount || input.escrow.amount_minor,
        currency: (refund.currency || input.escrow.currency).toUpperCase(),
        refund_type: "full",
        status: refund.status === "succeeded" ? "processed" : "processing",
        refund_reason: input.reason,
        customer_note: input.reason,
        merchant_note: input.reason,
        processor: "stripe",
        processed_at: refund.status === "succeeded" ? new Date().toISOString() : null,
        provider_response: refund as Record<string, unknown>,
        metadata: {
          source: "payment_service",
        },
      })
      .select("*")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return {
      provider: "stripe" as const,
      refundId: refund.id,
      refundReference: refund.id,
      raw: refund as Record<string, unknown>,
      refundRecord,
    };
  }

  const refund = await createPaystackRefund({
    transaction: input.escrow.transaction.provider_reference,
    amount: input.escrow.amount_minor,
    currency: input.escrow.currency,
    customer_note: input.reason,
    merchant_note: input.reason,
  });

  const refundRecord = await recordInitiatedPropertyRefund({
    transactionId: input.escrow.transaction_id,
    requestedByUserId: input.requestedByUserId,
    amountMinor: input.escrow.amount_minor,
    refundReason: input.reason,
    customerNote: input.reason,
    merchantNote: input.reason,
    paystackRefund: refund,
  });

  return {
    provider: "paystack" as const,
    refundId: refund.id !== undefined ? String(refund.id) : null,
    refundReference: refund.refund_reference || null,
    raw: refund as Record<string, unknown>,
    refundRecord: refundRecord.refund,
  };
}
