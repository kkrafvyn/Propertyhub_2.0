import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import {
  initiateMomoCollection,
  initiateMomoDisbursement,
  normaliseGhanaPhone,
} from "../_shared/momo.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);

    await enforceRateLimit({
      bucket: rateLimitKey("momo-init", user.id),
      maxHits: 20,
      windowSeconds: 60,
    });

    const body = await req.json().catch(() => null);
    if (!body) {
      throw new HttpError(400, "Invalid JSON body");
    }

    const {
      type = "collection", // 'collection' | 'disbursement'
      amount,              // number or numeric string (GHS)
      phone,               // Ghana MSISDN (e.g. 0244123456)
      note = "BaytMiftah Payment",
      message = "BaytMiftah REOS Transaction",
      invoiceId,           // optional utility invoice ID
      workOrderId,         // optional work order ID
      estateId,            // optional estate ID
      unitId,              // optional unit ID
    } = body;

    if (!amount || Number(amount) <= 0) {
      throw new HttpError(400, "Valid amount in GHS is required");
    }

    if (!phone || typeof phone !== "string") {
      throw new HttpError(400, "Valid Ghana phone number is required");
    }

    const admin = createAdminClient();
    const referenceId = crypto.randomUUID();
    const externalId = `momo_${Date.now()}_${referenceId.slice(0, 8)}`;
    const formattedAmount = Number(amount).toFixed(2);
    const amountMinor = Math.round(Number(amount) * 100);

    if (type === "disbursement") {
      // Payout (e.g., contractor escrow release or owner disbursement)
      await initiateMomoDisbursement({
        referenceId,
        amount: formattedAmount,
        currency: "GHS",
        payeeMsisdn: phone,
        payerMessage: message,
        payeeNote: note,
        externalId,
      });

      // Update work order or escrow release if provided
      if (workOrderId) {
        await admin
          .from("estate_momo_escrow_releases")
          .update({
            provider_reference: referenceId,
            momo_status: "submitted",
          })
          .eq("work_order_id", workOrderId);
      }

      return jsonResponse(
        200,
        {
          success: true,
          type: "disbursement",
          referenceId,
          externalId,
          amount: formattedAmount,
          recipient: normaliseGhanaPhone(phone),
          status: "PENDING",
        },
        req
      );
    } else {
      // Collection (Request To Pay tenant / customer)
      await initiateMomoCollection({
        referenceId,
        amount: formattedAmount,
        currency: "GHS",
        payerMsisdn: phone,
        payerMessage: message,
        payeeNote: note,
        externalId,
      });

      // Record transaction if applicable
      await admin.from("property_transactions").insert({
        provider: "mtn_momo",
        provider_reference: referenceId,
        amount_minor: amountMinor,
        currency: "GHS",
        purpose: invoiceId ? "utility_bill" : "estate_service",
        status: "pending",
        payer_user_id: user.id,
        metadata: {
          invoiceId,
          workOrderId,
          estateId,
          unitId,
          phone: normaliseGhanaPhone(phone),
          externalId,
        },
      });

      // If utility invoice, update invoice record with momo reference
      if (invoiceId) {
        await admin
          .from("estate_utility_invoices")
          .update({
            momo_reference: referenceId,
            momo_dispatch_status: "dispatched",
            dispatched_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
      }

      return jsonResponse(
        200,
        {
          success: true,
          type: "collection",
          referenceId,
          externalId,
          amount: formattedAmount,
          payer: normaliseGhanaPhone(phone),
          status: "PENDING",
          message: "Prompt dispatched to subscriber's mobile phone",
        },
        req
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    console.error("initiate-momo-payment error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Failed to initiate MoMo transaction") }, req);
  }
});
