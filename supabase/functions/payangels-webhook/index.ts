import { HttpError, jsonResponse } from "../_shared/http.ts";
import { recordWebhookEvent } from "../_shared/audit-log.ts";
import { reconcilePayAngelsPayment } from "../_shared/payment-reconciliation.ts";
import { reconcilePayAngelsRefundWebhook } from "../_shared/refund-reconciliation.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  verifyPayangelsTransaction,
  verifyPayangelsWebhookSignature,
} from "../_shared/payangels.ts";

async function sha256Hex(raw: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type Claimed = { eventId: string; token: string };

async function finishClaim(claim: Claimed, succeeded: boolean) {
  const { data, error } = await createAdminClient().rpc("finish_payangels_webhook_event", {
    p_event_id: claim.eventId,
    p_lease_token: claim.token,
    p_succeeded: succeeded,
    p_error: succeeded ? null : "Provider reconciliation did not complete",
  });
  if (error || data !== true) throw new HttpError(503, "Webhook completion could not be persisted");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let claim: Claimed | null = null;
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-payangels-signature");
    if (!await verifyPayangelsWebhookSignature(rawBody, signature)) {
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
    const referenceHint = event.data?.reference?.trim() || event.data?.transaction_reference?.trim() || null;
    // Preserve event ID naming from the original provider handler.
    const eventId = event.data?.id != null
      ? String(event.data.id)
      : referenceHint && event.event ? `${event.event}:${referenceHint}` : null;
    if (!eventId) throw new HttpError(400, "Webhook payload is missing an event identifier");

    // A logged delivery is not an acknowledged payment. A prior delivery may
    // have failed AFTER the audit insert and must be retried on the same event.
    const { data: state, error: claimError } = await createAdminClient().rpc(
      "claim_payangels_webhook_event",
      { p_event_id: eventId, p_payload_sha256: await sha256Hex(rawBody), p_reference: referenceHint },
    );
    if (claimError || !state || typeof state !== "object") {
      throw new HttpError(503, "Unable to claim PayAngels webhook");
    }
    const result = state as { state?: string; token?: string };
    if (result.state === "completed") {
      return jsonResponse(200, { received: true, duplicate: true, event: event.event });
    }
    if (result.state !== "claimed" || !result.token) {
      // Returning success here would cause the provider to discard a delivery
      // that the first worker may still fail to reconcile.
      throw new HttpError(503, "Webhook processing is in progress; retry this delivery");
    }
    claim = { eventId, token: result.token };
    await recordWebhookEvent({
      provider: "payangels",
      eventId,
      reference: referenceHint,
      payload: event as Record<string, unknown>,
    }); // Duplicates here are audit history; claim state controls processing.

    let response: Response;
    if (event.event === "charge.success") {
      const reference = event.data?.reference?.trim();
      if (!reference) throw new HttpError(400, "Webhook payload is missing a reference");
      const verifiedTransaction = await verifyPayangelsTransaction(reference);
      const reconciliation = await reconcilePayAngelsPayment({
        reference,
        verifiedTransaction,
        source: "webhook",
      });
      response = jsonResponse(200, {
        received: true,
        event: event.event,
        transactionId: reconciliation.transaction.id,
        receiptId: reconciliation.receipt?.id || null,
        blockchainRecordId: typeof reconciliation.blockchainRecord?.id === "string"
          ? reconciliation.blockchainRecord.id : null,
        alreadyProcessed: reconciliation.alreadyProcessed,
      });
    } else if ((event.event || "").startsWith("refund.")) {
      const reconciliation = await reconcilePayAngelsRefundWebhook({
        event: event.event || "refund.unknown",
        refund: event.data || {},
      });
      response = jsonResponse(200, {
        received: true,
        event: event.event,
        transactionId: reconciliation.transaction.id,
        refundId: reconciliation.refund?.id || null,
      });
    } else {
      response = jsonResponse(200, { received: true, ignored: true, event: event.event || "unknown" });
    }

    // Only acknowledge a provider event after the completed state is durable.
    await finishClaim(claim, true);
    claim = null;
    return response;
  } catch (error) {
    if (claim) {
      try {
        await finishClaim(claim, false);
      } catch (completeError) {
        console.error("PayAngels webhook retry-state update failed:", completeError);
      }
    }
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message });
    console.error("payangels-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
