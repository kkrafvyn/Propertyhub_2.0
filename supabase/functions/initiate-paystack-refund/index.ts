import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { refundPropertyTransaction } from "../_shared/payment-service.ts";
import { getPropertyRefundSummary } from "../_shared/refund-reconciliation.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

function parseRefundAmountToMinorUnits(amount: unknown) {
  if (amount === undefined || amount === null || amount === "") {
    return null;
  }

  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    return Math.round(amount * 100);
  }

  if (typeof amount === "string") {
    const normalized = Number.parseFloat(amount);
    if (Number.isFinite(normalized) && normalized > 0) {
      return Math.round(normalized * 100);
    }
  }

  throw new HttpError(400, "amount must be greater than zero when provided");
}

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
    const requestBody = await req.json().catch(() => null);
    const transactionId =
      typeof requestBody?.transactionId === "string" ? requestBody.transactionId.trim() : "";
    const refundReason =
      typeof requestBody?.reason === "string" ? requestBody.reason.trim() : "";
    const customerNote =
      typeof requestBody?.customerNote === "string" ? requestBody.customerNote.trim() : "";
    const merchantNote =
      typeof requestBody?.merchantNote === "string" ? requestBody.merchantNote.trim() : "";

    if (!transactionId) {
      throw new HttpError(400, "transactionId is required");
    }

    if (!refundReason) {
      throw new HttpError(400, "reason is required");
    }

    const requestedAmountMinor = parseRefundAmountToMinorUnits(requestBody?.amount);
    const admin = createAdminClient();

    const { data: transaction, error: transactionError } = await admin
      .from("property_transactions")
      .select(
        "id, provider, provider_reference, provider_transaction_id, amount_minor, refunded_amount_minor, status, organization_id, property_id, currency, stripe_payment_intent_id, stripe_charge_id, metadata"
      )
      .eq("id", transactionId)
      .maybeSingle();

    if (transactionError) {
      throw new HttpError(500, transactionError.message);
    }

    if (!transaction) {
      throw new HttpError(404, "Property transaction not found");
    }

    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", transaction.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new HttpError(500, membershipError.message);
    }

    if (!membership || !["owner", "manager"].includes(membership.role)) {
      throw new HttpError(403, "Only workspace owners and managers can issue refunds");
    }

    if (!["success", "reversal_pending"].includes(transaction.status)) {
      throw new HttpError(400, "Only successful property payments can be refunded");
    }

    const refundSummary = await getPropertyRefundSummary(transaction.id);
    if (refundSummary.hasActiveRefund) {
      throw new HttpError(
        409,
        "This payment already has a refund in progress. Wait for it to finish first."
      );
    }

    const availableAmountMinor = Math.max(
      transaction.amount_minor - refundSummary.processedAmountMinor,
      0
    );

    if (availableAmountMinor <= 0) {
      throw new HttpError(400, "This payment has already been fully refunded");
    }

    const amountMinor = requestedAmountMinor ?? availableAmountMinor;

    if (amountMinor > availableAmountMinor) {
      throw new HttpError(400, "Refund amount cannot exceed the remaining refundable balance");
    }

    const result = await refundPropertyTransaction({
      admin,
      transaction,
      requestedByUserId: user.id,
      amountMinor,
      refundReason,
      customerNote: customerNote || refundReason,
      merchantNote: merchantNote || refundReason,
    });

    return jsonResponse(200, {
      transaction: result.transaction,
      refund: result.refundRecord,
      provider: result.provider,
      refundableBalanceMinor: Math.max(
        result.transaction.amount_minor - result.transaction.refunded_amount_minor,
        0
      ),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initiate-paystack-refund error:", error);
    return jsonResponse(500, { error: "Unable to initiate refund" });
  }
});
