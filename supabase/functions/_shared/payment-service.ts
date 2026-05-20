import { HttpError } from "./http.ts";
import { createPaystackRefund, createPaystackTransfer } from "./paystack.ts";
import {
  recordInitiatedGatewayPropertyRefund,
  recordInitiatedPropertyRefund,
} from "./refund-reconciliation.ts";
import {
  createStripeCheckoutSession,
  createStripeRefund,
  createStripeTransfer,
} from "./stripe.ts";
import {
  createFlutterwaveRefund,
  createFlutterwaveTransfer,
  initializeFlutterwaveSubscriptionPayment,
  initializeGatewayPayment,
  type PaymentGatewayProvider,
} from "./payment-gateways.ts";

export type PaymentProcessor = "paystack" | "stripe" | "flutterwave";

export function normalizePaymentProcessor(value?: string | null): PaymentProcessor | null {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "paystack" || normalized === "stripe" || normalized === "flutterwave") {
    return normalized;
  }

  return null;
}

export function selectEscrowProcessor(
  currency?: string | null,
  provider?: string | null
): PaymentProcessor {
  return normalizePaymentProcessor(provider) || "paystack";
}

function getEscrowProcessor(escrow: any) {
  return selectEscrowProcessor(escrow.currency, escrow.payment_processor || escrow.transaction?.provider);
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
  amountMinor?: number;
  currency?: string;
  stripePriceId?: string | null;
  flutterwavePaymentPlanId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  if (input.provider === "flutterwave") {
    if (!input.flutterwavePaymentPlanId) {
      throw new HttpError(400, "A Flutterwave payment plan ID is required for subscriptions");
    }

    return initializeFlutterwaveSubscriptionPayment({
      amountMinor: input.amountMinor || 0,
      currency: input.currency || "GHS",
      email: input.email,
      reference: input.reference,
      callbackUrl: input.successUrl,
      paymentPlanId: input.flutterwavePaymentPlanId,
      description: `BaytMiftah ${input.tierName}`,
      metadata: input.metadata,
    }).then((checkout) => ({
      provider: "flutterwave" as const,
      authorizationUrl: checkout.authorizationUrl,
      reference: checkout.reference,
      providerTransactionId: checkout.providerTransactionId,
      raw: checkout.raw,
    }));
  }

  if (input.provider !== "stripe") {
    throw new HttpError(400, "Paystack subscriptions use the dedicated Paystack subscription flow");
  }

  if (!input.stripePriceId) {
    throw new HttpError(400, "A Stripe price ID is required for subscriptions");
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
  const processor = getEscrowProcessor(input.escrow);

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

  if (processor === "flutterwave") {
    const organization = input.escrow.organization || {};
    const beneficiary =
      organization.flutterwave_beneficiary_id ||
      organization.flutterwave_transfer_beneficiary_id ||
      organization.flutterwave_subaccount_id ||
      Deno.env.get("FLUTTERWAVE_DEFAULT_ESCROW_BENEFICIARY_ID");
    const accountBank =
      organization.flutterwave_account_bank ||
      Deno.env.get("FLUTTERWAVE_DEFAULT_ESCROW_ACCOUNT_BANK");
    const accountNumber =
      organization.flutterwave_account_number ||
      Deno.env.get("FLUTTERWAVE_DEFAULT_ESCROW_ACCOUNT_NUMBER");

    const transfer = await createFlutterwaveTransfer({
      amountMinor: input.escrow.release_amount_minor || input.escrow.amount_minor,
      currency: input.escrow.currency,
      reference: input.reference,
      narration: input.reason,
      beneficiary,
      beneficiaryName: organization.name || organization.escrow_release_account_label || null,
      accountBank,
      accountNumber,
      debitSubaccount: organization.flutterwave_subaccount_id || null,
      callbackUrl: Deno.env.get("FLUTTERWAVE_TRANSFER_CALLBACK_URL") || null,
      metadata: {
        escrowId: input.escrow.id,
        organizationId: input.escrow.organization_id,
      },
    });

    return {
      provider: "flutterwave" as const,
      reference: transfer.reference || input.reference,
      transferCode: transfer.id !== undefined ? String(transfer.id) : transfer.reference || null,
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

export async function refundPropertyTransaction(input: {
  admin: any;
  transaction: any;
  requestedByUserId: string;
  amountMinor: number;
  refundReason: string;
  customerNote?: string | null;
  merchantNote?: string | null;
}) {
  const processor = normalizePaymentProcessor(input.transaction.provider);
  if (!processor) {
    throw new HttpError(400, "Refunds are only configured for Paystack, Stripe, and Flutterwave");
  }

  const remainingAmountMinor = Math.max(
    input.transaction.amount_minor - (input.transaction.refunded_amount_minor || 0),
    0
  );
  const shouldPassAmount =
    input.amountMinor < input.transaction.amount_minor ||
    (input.transaction.refunded_amount_minor || 0) > 0;

  if (input.amountMinor > remainingAmountMinor) {
    throw new HttpError(400, "Refund amount cannot exceed the remaining refundable balance");
  }

  if (processor === "stripe") {
    const paymentIntent =
      input.transaction.stripe_payment_intent_id ||
      input.transaction.metadata?.stripe?.metadata?.stripePaymentIntentId ||
      null;
    const charge = input.transaction.stripe_charge_id || null;
    if (!paymentIntent && !charge) {
      throw new HttpError(
        400,
        "Stripe refund requires a payment intent or charge ID from payment verification"
      );
    }

    const refund = await createStripeRefund({
      paymentIntent,
      charge,
      amountMinor: input.amountMinor,
      reason: input.refundReason,
      metadata: {
        transactionId: input.transaction.id,
        organizationId: input.transaction.organization_id,
      },
    });

    const result = await recordInitiatedGatewayPropertyRefund({
      transactionId: input.transaction.id,
      requestedByUserId: input.requestedByUserId,
      provider: "stripe",
      amountMinor: refund.amount || input.amountMinor,
      refundReason: input.refundReason,
      customerNote: input.customerNote || input.refundReason,
      merchantNote: input.merchantNote || input.refundReason,
      providerRefundId: refund.id,
      providerRefundReference: refund.id,
      providerStatus: refund.status,
      providerCurrency: refund.currency?.toUpperCase() || input.transaction.currency,
      processor: "stripe",
      providerResponse: refund as Record<string, unknown>,
    });

    return {
      provider: "stripe" as const,
      refundId: refund.id,
      refundReference: refund.id,
      raw: refund as Record<string, unknown>,
      refundRecord: result.refund,
      transaction: result.transaction,
    };
  }

  if (processor === "flutterwave") {
    const transactionId =
      input.transaction.provider_transaction_id ||
      input.transaction.metadata?.flutterwave?.id ||
      input.transaction.metadata?.flutterwave?.metadata?.raw?.id;

    if (!transactionId) {
      throw new HttpError(
        400,
        "Flutterwave refund requires the provider transaction ID from payment verification"
      );
    }

    const refund = await createFlutterwaveRefund({
      transactionId,
      amountMinor: shouldPassAmount ? input.amountMinor : undefined,
      reason: input.customerNote || input.refundReason,
    });

    const refundId = refund.id !== undefined ? String(refund.id) : null;
    const refundReference = refund.tx_ref || refund.flw_ref || refundId;
    const flutterwaveRefundAmount =
      typeof refund.amount === "number"
        ? Math.round(refund.amount * 100)
        : Number.isFinite(Number.parseFloat(String(refund.amount || "")))
          ? Math.round(Number.parseFloat(String(refund.amount)) * 100)
          : input.amountMinor;
    const result = await recordInitiatedGatewayPropertyRefund({
      transactionId: input.transaction.id,
      requestedByUserId: input.requestedByUserId,
      provider: "flutterwave",
      amountMinor: flutterwaveRefundAmount,
      refundReason: input.refundReason,
      customerNote: input.customerNote || input.refundReason,
      merchantNote: input.merchantNote || input.refundReason,
      providerRefundId: refundId,
      providerRefundReference: refundReference,
      providerStatus: refund.status,
      providerCurrency: refund.currency || input.transaction.currency,
      processor: "flutterwave",
      processedAt: refund.created_at || null,
      providerResponse: refund as Record<string, unknown>,
    });

    return {
      provider: "flutterwave" as const,
      refundId,
      refundReference,
      raw: refund as Record<string, unknown>,
      refundRecord: result.refund,
      transaction: result.transaction,
    };
  }

  const refund = await createPaystackRefund({
    transaction: input.transaction.provider_reference,
    amount: shouldPassAmount ? input.amountMinor : undefined,
    currency: input.transaction.currency,
    customer_note: input.customerNote || input.refundReason,
    merchant_note: input.merchantNote || input.refundReason,
  });

  const result = await recordInitiatedPropertyRefund({
    transactionId: input.transaction.id,
    requestedByUserId: input.requestedByUserId,
    amountMinor: input.amountMinor,
    refundReason: input.refundReason,
    customerNote: input.customerNote || input.refundReason,
    merchantNote: input.merchantNote || input.refundReason,
    paystackRefund: refund,
  });

  return {
    provider: "paystack" as const,
    refundId: refund.id !== undefined ? String(refund.id) : null,
    refundReference: refund.refund_reference || null,
    raw: refund as Record<string, unknown>,
    refundRecord: result.refund,
    transaction: result.transaction,
  };
}

export async function refundBuyer(input: {
  admin: any;
  escrow: any;
  requestedByUserId: string;
  reason: string;
}) {
  const transaction = {
    ...(input.escrow.transaction || {}),
    provider: getEscrowProcessor(input.escrow),
    id: input.escrow.transaction_id,
    organization_id: input.escrow.organization_id,
    property_id: input.escrow.property_id,
    amount_minor: input.escrow.amount_minor,
    currency: input.escrow.currency,
  };

  return refundPropertyTransaction({
    admin: input.admin,
    transaction,
    requestedByUserId: input.requestedByUserId,
    amountMinor: input.escrow.amount_minor,
    refundReason: input.reason,
    customerNote: input.reason,
    merchantNote: input.reason,
  });
}
