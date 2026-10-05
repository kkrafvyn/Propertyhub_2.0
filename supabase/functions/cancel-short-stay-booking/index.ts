import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  getPropertyRefundSummary,
  recordInitiatedPropertyRefund,
} from "../_shared/refund-reconciliation.ts";
import { createPayangelsRefund } from "../_shared/payangels.ts";
import { createAdminClient, createUserClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const userClient = createUserClient(authHeader!);
    const admin = createAdminClient();

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "Guest cancelled short-stay booking";

    if (!bookingId) {
      throw new HttpError(400, "bookingId is required");
    }

    const { data: intentBooking, error: intentError } = await userClient.rpc(
      "mark_booking_cancellation_intent",
      { p_booking_id: bookingId, p_reason: reason },
    );

    if (intentError) {
      throw new HttpError(400, intentError.message);
    }

    const booking = intentBooking as Record<string, unknown>;
    if (booking.status === "cancelled") {
      return jsonResponse(200, { booking, idempotent: true });
    }

    const refundMinor = Number(booking.refund_minor || 0);
    const transactionId = booking.transaction_id as string | null;

    if (transactionId && refundMinor > 0) {
      const { data: transaction, error: transactionError } = await admin
        .from("property_transactions")
        .select("id, provider_reference, amount_minor, refunded_amount_minor, status, currency")
        .eq("id", transactionId)
        .maybeSingle();

      if (transactionError) {
        throw new HttpError(500, transactionError.message);
      }

      if (transaction && ["success", "reversal_pending"].includes(transaction.status)) {
        const refundSummary = await getPropertyRefundSummary(transaction.id);
        const existingForBooking = refundSummary.refunds?.find(
          (row) => (row.metadata as Record<string, string> | null)?.booking_id === bookingId,
        );

        if (!existingForBooking && !refundSummary.hasActiveRefund) {
          await admin
            .from("short_stay_bookings")
            .update({ cancellation_status: "refund_pending", updated_at: new Date().toISOString() })
            .eq("id", bookingId);

          const availableAmountMinor = Math.max(
            transaction.amount_minor - refundSummary.processedAmountMinor,
            0,
          );
          const amountMinor = Math.min(refundMinor, availableAmountMinor);

          if (amountMinor > 0) {
            await admin
              .from("short_stay_bookings")
              .update({ cancellation_status: "refund_processing", updated_at: new Date().toISOString() })
              .eq("id", bookingId);

            const shouldPassAmount =
              amountMinor < transaction.amount_minor || refundSummary.processedAmountMinor > 0;
            const payangelsRefund = await createPayangelsRefund({
              transaction: transaction.provider_reference,
              amount: shouldPassAmount ? amountMinor : undefined,
              currency: transaction.currency,
              customer_note: reason,
              merchant_note: reason,
            });

            await recordInitiatedPropertyRefund({
              transactionId: transaction.id,
              requestedByUserId: user.id,
              amountMinor,
              refundReason: reason,
              customerNote: reason,
              merchantNote: reason,
              paystackRefund: payangelsRefund,
              metadata: { booking_id: bookingId },
            });

            await admin
              .from("short_stay_bookings")
              .update({ cancellation_status: "refund_completed", updated_at: new Date().toISOString() })
              .eq("id", bookingId);
          }
        } else if (existingForBooking) {
          await admin
            .from("short_stay_bookings")
            .update({ cancellation_status: "refund_completed", updated_at: new Date().toISOString() })
            .eq("id", bookingId);
        }
      }
    }

    const { data: finalized, error: finalizeError } = await admin.rpc(
      "finalize_booking_cancellation",
      {
        p_booking_id: bookingId,
        // Retained for the deployed RPC signature; the hardened function ignores
        // caller input and uses the policy-derived value stored on the booking.
        p_refund_minor: null,
      },
    );

    if (finalizeError) {
      await admin
        .from("short_stay_bookings")
        .update({ cancellation_status: "refund_failed", updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      throw new HttpError(500, finalizeError.message);
    }

    return jsonResponse(200, { booking: finalized, idempotent: false });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error("cancel-short-stay-booking error:", error);
    return jsonResponse(500, { error: "Unable to cancel booking" });
  }
});
