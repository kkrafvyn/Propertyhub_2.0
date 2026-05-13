import { HttpError, jsonResponse } from "../_shared/http.ts";
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
      };
    };

    if (event.event === "charge.success") {
      const reference = event.data?.reference?.trim();

      if (!reference) {
        throw new HttpError(400, "Webhook payload is missing a reference");
      }

      const verifiedTransaction = await verifyPaystackTransaction(reference);
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
        blockchainRecordId:
          result.blockchainRecord && typeof result.blockchainRecord.id === "string"
            ? result.blockchainRecord.id
            : null,
        alreadyProcessed: result.alreadyProcessed,
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
