import { sha256Hex } from "../_shared/cryptographic-audit.ts";
import { HttpError, jsonResponse } from "../_shared/http.ts";
import {
  reconcileFlutterwaveOrganizationSubscriptionPayment,
  reconcileOrganizationSubscriptionPayment,
  reconcilePaystackSubscriptionCreated,
  reconcilePaystackSubscriptionDisabled,
  reconcilePaystackSubscriptionFailure,
} from "../_shared/organization-subscription-reconciliation.ts";
import {
  reconcilePaystackPayment,
  reconcilePropertyPayment,
} from "../_shared/payment-reconciliation.ts";
import { reconcilePaystackRefundWebhook } from "../_shared/refund-reconciliation.ts";
import { verifyPaystackTransaction, verifyPaystackWebhookSignature } from "../_shared/paystack.ts";
import {
  verifyFlutterwaveWebhookSignature,
  verifyGatewayTransaction,
} from "../_shared/payment-gateways.ts";
import {
  reconcileStripeCheckoutSession,
  reconcileStripeInvoiceFailed,
  reconcileStripeInvoicePaid,
  reconcileStripeSubscriptionDeleted,
} from "../_shared/stripe-reconciliation.ts";
import { verifyStripeWebhookSignature } from "../_shared/stripe.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { beginWebhookEvent, finishWebhookEvent } from "../_shared/webhook-events.ts";

function paystackReference(data: any) {
  return (
    data?.reference ||
    data?.transaction_reference ||
    data?.transaction?.reference ||
    data?.refund_reference ||
    ""
  ).trim();
}

async function paystackEventId(event: string, data: any, rawBody: string) {
  const stableId = data?.id || data?.event_id || paystackReference(data);
  if (stableId) return `${event}:${stableId}`;
  return `${event}:${await sha256Hex(rawBody)}`;
}

async function handlePaystackEvent(event: { event?: string; data?: any }) {
  const eventType = event.event || "unknown";

  if (eventType === "charge.success") {
    const reference = paystackReference(event.data);
    if (!reference) throw new HttpError(400, "Webhook payload is missing a reference");

    const verifiedTransaction = await verifyPaystackTransaction(reference);
    const subscriptionResult = await reconcileOrganizationSubscriptionPayment({
      reference,
      verifiedTransaction,
      source: "webhook",
    });

    if (subscriptionResult) {
      return {
        received: true,
        event: eventType,
        subscriptionId: subscriptionResult.subscription?.id || null,
        paymentId: subscriptionResult.payment.id,
        alreadyProcessed: subscriptionResult.alreadyProcessed,
        paymentType: "organization_subscription",
      };
    }

    const result = await reconcilePaystackPayment({
      reference,
      verifiedTransaction,
      source: "webhook",
    });

    return {
      received: true,
      event: eventType,
      transactionId: result.transaction.id,
      receiptId: result.receipt?.id || null,
      alreadyProcessed: result.alreadyProcessed,
      paymentType: "property_payment",
    };
  }

  if (eventType === "subscription.create") {
    const subscription = await reconcilePaystackSubscriptionCreated(event.data || {});
    return {
      received: true,
      event: eventType,
      subscriptionId: subscription?.id || null,
      ignored: !subscription,
    };
  }

  if (eventType === "invoice.payment_failed") {
    const subscription = await reconcilePaystackSubscriptionFailure({
      event: eventType,
      data: event.data || {},
    });
    return {
      received: true,
      event: eventType,
      subscriptionId: subscription?.id || null,
      ignored: !subscription,
    };
  }

  if (eventType === "invoice.update") {
    const reference = paystackReference(event.data);
    if (reference) {
      const verifiedTransaction = await verifyPaystackTransaction(reference);
      const subscriptionResult = await reconcileOrganizationSubscriptionPayment({
        reference,
        verifiedTransaction,
        source: "webhook",
      });

      if (subscriptionResult) {
        return {
          received: true,
          event: eventType,
          subscriptionId: subscriptionResult.subscription?.id || null,
          paymentId: subscriptionResult.payment.id,
          alreadyProcessed: subscriptionResult.alreadyProcessed,
        };
      }
    }

    return { received: true, ignored: true, event: eventType };
  }

  if (eventType === "subscription.disable" || eventType === "subscription.not_renew") {
    const subscription = await reconcilePaystackSubscriptionDisabled({
      event: eventType,
      data: event.data || {},
    });
    return {
      received: true,
      event: eventType,
      subscriptionId: subscription?.id || null,
      ignored: !subscription,
    };
  }

  if (eventType.startsWith("refund.")) {
    const result = await reconcilePaystackRefundWebhook({
      event: eventType,
      refund: event.data || {},
    });
    return {
      received: true,
      event: eventType,
      transactionId: result.transaction.id,
      refundId: result.refund?.id || null,
    };
  }

  return { received: true, ignored: true, event: eventType };
}

async function handleStripeEvent(event: { id?: string; type?: string; data?: { object?: any } }) {
  const eventType = event.type || "unknown";
  const object = event.data?.object || {};

  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded" ||
    eventType === "checkout.session.expired"
  ) {
    const result = await reconcileStripeCheckoutSession(object, "webhook");
    return {
      received: true,
      event: eventType,
      ignored: !result,
      result,
    };
  }

  if (eventType === "invoice.paid") {
    const result = await reconcileStripeInvoicePaid(object);
    return {
      received: true,
      event: eventType,
      subscriptionId: result?.subscription?.id || null,
      paymentId: result?.payment?.id || null,
      ignored: !result,
    };
  }

  if (eventType === "invoice.payment_failed") {
    const result = await reconcileStripeInvoiceFailed(object);
    return {
      received: true,
      event: eventType,
      subscriptionId: result?.id || null,
      ignored: !result,
    };
  }

  if (eventType === "customer.subscription.deleted") {
    const result = await reconcileStripeSubscriptionDeleted(object);
    return {
      received: true,
      event: eventType,
      subscriptionId: result?.id || null,
      ignored: !result,
    };
  }

  return { received: true, ignored: true, event: eventType };
}

async function handleFlutterwaveEvent(event: {
  event?: string;
  data?: {
    tx_ref?: string;
    reference?: string;
    status?: string;
  };
}) {
  const reference = (event.data?.tx_ref || event.data?.reference || "").trim();
  const status = (event.data?.status || "").toLowerCase();
  const eventName = (event.event || "charge.completed").toLowerCase();

  if (!reference) {
    throw new HttpError(400, "Webhook payload is missing a transaction reference");
  }

  if (eventName && !eventName.includes("charge")) {
    return {
      received: true,
      ignored: true,
      event: event.event || "unknown",
    };
  }

  if (status && !["successful", "success"].includes(status)) {
    return {
      received: true,
      ignored: true,
      event: event.event || "charge.completed",
      status,
    };
  }

  const verifiedTransaction = await verifyGatewayTransaction("flutterwave", reference);
  const subscriptionResult = await reconcileFlutterwaveOrganizationSubscriptionPayment({
    reference,
    verifiedTransaction,
    source: "webhook",
  });

  if (subscriptionResult) {
    return {
      received: true,
      event: event.event || "charge.completed",
      subscriptionId: subscriptionResult.subscription?.id || null,
      paymentId: subscriptionResult.payment.id,
      alreadyProcessed: subscriptionResult.alreadyProcessed,
      paymentType: "organization_subscription",
    };
  }

  const result = await reconcilePropertyPayment({
    provider: "flutterwave",
    reference,
    verifiedTransaction,
    source: "webhook",
  });

  return {
    received: true,
    event: event.event || "charge.completed",
    transactionId: result.transaction.id,
    receiptId: result.receipt?.id || null,
    alreadyProcessed: result.alreadyProcessed,
    paymentType: "property_payment",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const admin = createAdminClient();
  let webhookRow: { id: string } | null = null;

  try {
    const rawBody = await req.text();
    const paystackSignature = req.headers.get("x-paystack-signature");
    const stripeSignature = req.headers.get("stripe-signature");
    const flutterwaveSignature = req.headers.get("verif-hash");

    if (paystackSignature) {
      const isValidSignature = await verifyPaystackWebhookSignature(rawBody, paystackSignature);
      if (!isValidSignature) throw new HttpError(401, "Invalid Paystack webhook signature");

      const event = JSON.parse(rawBody) as { event?: string; data?: any };
      const idempotency = await beginWebhookEvent({
        admin,
        provider: "paystack",
        providerEventId: await paystackEventId(event.event || "unknown", event.data || {}, rawBody),
        eventType: event.event || "unknown",
        signatureVerified: true,
        rawPayload: event as Record<string, unknown>,
      });

      webhookRow = idempotency.row;
      if (idempotency.alreadyProcessed) {
        return jsonResponse(200, { received: true, duplicate: true, event: event.event || "unknown" });
      }

      const processed = await handlePaystackEvent(event);
      await finishWebhookEvent({
        admin,
        id: webhookRow.id,
        status: (processed as any).ignored ? "ignored" : "processed",
        processedPayload: processed,
      });
      return jsonResponse(200, processed);
    }

    if (stripeSignature) {
      const isValidSignature = await verifyStripeWebhookSignature(rawBody, stripeSignature);
      if (!isValidSignature) throw new HttpError(401, "Invalid Stripe webhook signature");

      const event = JSON.parse(rawBody) as { id?: string; type?: string; data?: { object?: any } };
      const idempotency = await beginWebhookEvent({
        admin,
        provider: "stripe",
        providerEventId: event.id || `${event.type || "unknown"}:${await sha256Hex(rawBody)}`,
        eventType: event.type || "unknown",
        signatureVerified: true,
        rawPayload: event as Record<string, unknown>,
      });

      webhookRow = idempotency.row;
      if (idempotency.alreadyProcessed) {
        return jsonResponse(200, { received: true, duplicate: true, event: event.type || "unknown" });
      }

      const processed = await handleStripeEvent(event);
      await finishWebhookEvent({
        admin,
        id: webhookRow.id,
        status: (processed as any).ignored ? "ignored" : "processed",
        processedPayload: processed,
      });
      return jsonResponse(200, processed);
    }

    if (flutterwaveSignature) {
      if (!verifyFlutterwaveWebhookSignature(flutterwaveSignature)) {
        throw new HttpError(401, "Invalid Flutterwave webhook signature");
      }

      const event = JSON.parse(rawBody) as {
        event?: string;
        data?: {
          tx_ref?: string;
          reference?: string;
          status?: string;
        };
      };
      const providerEventId =
        event.data?.tx_ref ||
        event.data?.reference ||
        `${event.event || "unknown"}:${await sha256Hex(rawBody)}`;
      const idempotency = await beginWebhookEvent({
        admin,
        provider: "flutterwave",
        providerEventId,
        eventType: event.event || "unknown",
        signatureVerified: true,
        rawPayload: event as Record<string, unknown>,
      });

      webhookRow = idempotency.row;
      if (idempotency.alreadyProcessed) {
        return jsonResponse(200, { received: true, duplicate: true, event: event.event || "unknown" });
      }

      const processed = await handleFlutterwaveEvent(event);
      await finishWebhookEvent({
        admin,
        id: webhookRow.id,
        status: (processed as any).ignored ? "ignored" : "processed",
        processedPayload: processed,
      });
      return jsonResponse(200, processed);
    }

    throw new HttpError(401, "Missing supported webhook signature");
  } catch (error) {
    if (webhookRow) {
      await finishWebhookEvent({
        admin,
        id: webhookRow.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Webhook processing failed",
      }).catch((finishError) => console.error("Failed to mark webhook event failed:", finishError));
    }

    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("payment-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
