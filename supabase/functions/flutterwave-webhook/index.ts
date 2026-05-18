import { HttpError, jsonResponse } from "../_shared/http.ts";
import { reconcilePropertyPayment } from "../_shared/payment-reconciliation.ts";
import {
  verifyFlutterwaveWebhookSignature,
  verifyGatewayTransaction,
} from "../_shared/payment-gateways.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("verif-hash");

    if (!verifyFlutterwaveWebhookSignature(signature)) {
      throw new HttpError(401, "Invalid webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        tx_ref?: string;
        reference?: string;
        status?: string;
      };
    };

    const reference = (event.data?.tx_ref || event.data?.reference || "").trim();
    const status = (event.data?.status || "").toLowerCase();
    const eventName = (event.event || "").toLowerCase();

    if (!reference) {
      throw new HttpError(400, "Webhook payload is missing a transaction reference");
    }

    if (eventName && !eventName.includes("charge")) {
      return jsonResponse(200, {
        received: true,
        ignored: true,
        event: event.event || "unknown",
      });
    }

    if (status && !["successful", "success"].includes(status)) {
      return jsonResponse(200, {
        received: true,
        ignored: true,
        event: event.event || "charge.completed",
        status,
      });
    }

    const verifiedTransaction = await verifyGatewayTransaction("flutterwave", reference);
    const result = await reconcilePropertyPayment({
      provider: "flutterwave",
      reference,
      verifiedTransaction,
      source: "webhook",
    });

    return jsonResponse(200, {
      received: true,
      event: event.event || "charge.completed",
      transactionId: result.transaction.id,
      receiptId: result.receipt?.id || null,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("flutterwave-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
