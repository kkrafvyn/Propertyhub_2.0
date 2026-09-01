import { HttpError, jsonResponse } from "../_shared/http.ts";
import { recordWebhookEvent } from "../_shared/audit-log.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { verifyMomoCollection, verifyMomoDisbursement, verifyMomoWebhook } from "../_shared/momo.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-momo-signature") || req.headers.get("x-momo-webhook-signature");
    if (!(await verifyMomoWebhook(rawBody, signature))) {
      throw new HttpError(401, "Invalid MoMo webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      financialTransactionId?: string;
      externalId?: string;
      amount?: string;
      currency?: string;
      payer?: { partyIdType: string; partyId: string };
      payee?: { partyIdType: string; partyId: string };
      status?: "SUCCESSFUL" | "FAILED" | "PENDING";
      reason?: { code?: string; message?: string };
    };

    const eventId = String(
      event.financialTransactionId ||
      event.externalId ||
      `momo_${Date.now()}_${rawBody.slice(0, 32)}`
    );

    const replay = await recordWebhookEvent({
      provider: "mtn_momo",
      eventId,
      reference: event.externalId || null,
      payload: event as Record<string, unknown>,
    });

    if (replay.duplicate) {
      return jsonResponse(200, { received: true, duplicate: true, status: event.status });
    }

    const admin = createAdminClient();

    if (event.externalId) {
      // 1. Check property_transactions
      const { data: tx } = await admin
        .from("property_transactions")
        .select("id, metadata, purpose")
        .contains("metadata", { externalId: event.externalId })
        .maybeSingle();

      if (tx) {
        const collectionStatus = await verifyMomoCollection(
          event.financialTransactionId || event.externalId,
        );
        const verifiedStatus = collectionStatus.status;

        await admin
          .from("property_transactions")
          .update({
            status: verifiedStatus === "SUCCESSFUL" ? "paid" : verifiedStatus === "FAILED" ? "failed" : "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);

        const metadata = tx.metadata as Record<string, unknown> | null;
        const invoiceId = metadata?.invoiceId as string | undefined;

        if (invoiceId && verifiedStatus === "SUCCESSFUL") {
          await admin
            .from("estate_utility_invoices")
            .update({
              momo_dispatch_status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);
        }
      }

      // 2. Check escrow releases (Disbursement)
      const { data: escrow } = await admin
        .from("estate_momo_escrow_releases")
        .select("id, work_order_id")
        .eq("provider_reference", event.externalId)
        .maybeSingle();

      if (escrow) {
        const disbursementStatus = await verifyMomoDisbursement(event.financialTransactionId || event.externalId);
        await admin
          .from("estate_momo_escrow_releases")
          .update({
            momo_status: disbursementStatus.status === "SUCCESSFUL" ? "successful" : disbursementStatus.status === "FAILED" ? "failed" : "pending",
            released_at: disbursementStatus.status === "SUCCESSFUL" ? new Date().toISOString() : null,
            failure_reason: disbursementStatus.status === "FAILED" ? (disbursementStatus.reason || event.reason?.message || "Transfer failed") : null,
          })
          .eq("id", escrow.id);

        if (disbursementStatus.status === "SUCCESSFUL" && escrow.work_order_id) {
          await admin
            .from("estate_contractor_work_orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", escrow.work_order_id);
        }
      }
    }

    return jsonResponse(200, {
      received: true,
      status: event.status || "UNKNOWN",
      financialTransactionId: event.financialTransactionId || null,
      externalId: event.externalId || null,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("momo-webhook error:", error);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
