import { HttpError, jsonResponse } from "../_shared/http.ts";
import {
  reconcileOrganizationSubscriptionPayment,
  reconcilePaystackSubscriptionCreated,
  reconcilePaystackSubscriptionDisabled,
  reconcilePaystackSubscriptionFailure,
} from "../_shared/organization-subscription-reconciliation.ts";
import { reconcilePaystackPayment } from "../_shared/payment-reconciliation.ts";
import { reconcilePaystackRefundWebhook } from "../_shared/refund-reconciliation.ts";
import { verifyPaystackTransaction, verifyPaystackWebhookSignature } from "../_shared/paystack.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const isValidSignature = await verifyPaystackWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      throw new HttpError(401, "Invalid webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        reference?: string;
        transaction_reference?: string;
        transaction?: {
          reference?: string;
        };
      };
    };

    if (event.event === "charge.success") {
      const reference = event.data?.reference?.trim();

      if (!reference) {
        throw new HttpError(400, "Webhook payload is missing a reference");
      }

      const verifiedTransaction = await verifyPaystackTransaction(reference);
      const subscriptionResult = await reconcileOrganizationSubscriptionPayment({
        reference,
        verifiedTransaction,
        source: "webhook",
      });

      if (subscriptionResult) {
        return jsonResponse(200, {
          received: true,
          event: event.event,
          subscriptionId: subscriptionResult.subscription?.id || null,
          paymentId: subscriptionResult.payment.id,
          alreadyProcessed: subscriptionResult.alreadyProcessed,
          paymentType: "organization_subscription",
        });
      }

      const result = await reconcilePaystackPayment({
        reference,
        verifiedTransaction,
        source: "webhook",
      });

      return jsonResponse(200, {
        received: true,
        event: event.event,
        transactionId: result.transaction.id,
        receiptId: result.receipt?.id || null,
        alreadyProcessed: result.alreadyProcessed,
        paymentType: "property_payment",
      });
    }

    if (event.event === "subscription.create") {
      const subscription = await reconcilePaystackSubscriptionCreated(event.data || {});

      return jsonResponse(200, {
        received: true,
        event: event.event,
        subscriptionId: subscription?.id || null,
        ignored: !subscription,
      });
    }

    if (event.event === "invoice.payment_failed") {
      const subscription = await reconcilePaystackSubscriptionFailure({
        event: event.event,
        data: event.data || {},
      });

      return jsonResponse(200, {
        received: true,
        event: event.event,
        subscriptionId: subscription?.id || null,
        ignored: !subscription,
      });
    }

    if (event.event === "invoice.update") {
      const reference = event.data?.transaction?.reference || event.data?.reference || "";
      if (reference) {
        const verifiedTransaction = await verifyPaystackTransaction(reference);
        const subscriptionResult = await reconcileOrganizationSubscriptionPayment({
          reference,
          verifiedTransaction,
          source: "webhook",
        });

        if (subscriptionResult) {
          return jsonResponse(200, {
            received: true,
            event: event.event,
            subscriptionId: subscriptionResult.subscription?.id || null,
            paymentId: subscriptionResult.payment.id,
            alreadyProcessed: subscriptionResult.alreadyProcessed,
          });
        }
      }

      return jsonResponse(200, {
        received: true,
        ignored: true,
        event: event.event,
      });
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const subscription = await reconcilePaystackSubscriptionDisabled({
        event: event.event,
        data: event.data || {},
      });

      return jsonResponse(200, {
        received: true,
        event: event.event,
        subscriptionId: subscription?.id || null,
        ignored: !subscription,
      });
    }

    if ((event.event || "").startsWith("refund.")) {
      const result = await reconcilePaystackRefundWebhook({
        event: event.event || "refund.unknown",
        refund: event.data || {},
      });

      return jsonResponse(200, {
        received: true,
        event: event.event,
        transactionId: result.transaction.id,
        refundId: result.refund?.id || null,
      });
    }

    return jsonResponse(200, {
      received: true,
      ignored: true,
      event: event.event || "unknown",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("paystack-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
