import { HttpError, jsonResponse } from "../_shared/http.ts";
import { recordWebhookEvent } from "../_shared/audit-log.ts";
import { reconcilePaystackPayment } from "../_shared/payment-reconciliation.ts";
import { reconcilePaystackRefundWebhook } from "../_shared/refund-reconciliation.ts";
import {
  verifyPayangelsTransaction,
  verifyPayangelsWebhookSignature,
} from "../_shared/payangels.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-payangels-signature");
    const isValidSignature = await verifyPayangelsWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      throw new HttpError(401, "Invalid webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        id?: number | string;
        reference?: string;
        transaction_reference?: string;
      };
    };

    const referenceHint =
      event.data?.reference?.trim() || event.data?.transaction_reference?.trim() || null;
    const eventId =
      event.data?.id != null
        ? String(event.data.id)
        : referenceHint && event.event
          ? `${event.event}:${referenceHint}`
          : null;

    if (!eventId) {
      throw new HttpError(400, "Webhook payload is missing an event identifier");
    }

    const replay = await recordWebhookEvent({
      provider: "payangels",
      eventId,
      reference: referenceHint,
      payload: event as Record<string, unknown>,
    });

    if (replay.duplicate) {
      return jsonResponse(200, { received: true, duplicate: true, event: event.event });
    }

    if (event.event === "charge.success") {
      const reference = event.data?.reference?.trim();

      if (!reference) {
        throw new HttpError(400, "Webhook payload is missing a reference");
      }

      const verifiedTransaction = await verifyPayangelsTransaction(reference);
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

    console.error("payangels-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
