import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { reconcilePaystackPayment } from "../_shared/payment-reconciliation.ts";
import { verifyPaystackTransaction } from "../_shared/paystack.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

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
    const reference =
      typeof requestBody?.reference === "string" ? requestBody.reference.trim() : "";

    if (!reference) {
      throw new HttpError(400, "reference is required");
    }

    const admin = createAdminClient();
    const { data: propertyTransaction, error: transactionError } = await admin
      .from("property_transactions")
      .select("id, payer_user_id, organization_id")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (transactionError) {
      throw new HttpError(500, transactionError.message);
    }

    if (!propertyTransaction) {
      throw new HttpError(404, "Payment transaction not found");
    }

    const isPayer = propertyTransaction.payer_user_id === user.id;
    let isOrgMember = false;

    if (!isPayer) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", propertyTransaction.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();
      isOrgMember = Boolean(membership);
    }

    if (!isPayer && !isOrgMember) {
      throw new HttpError(403, "You are not allowed to verify this payment");
    }

    const verifiedTransaction = await verifyPaystackTransaction(reference);
    const result = await reconcilePaystackPayment({
      reference,
      verifiedTransaction,
      verifiedByUserId: user.id,
      source: "manual_verify",
    });

    return jsonResponse(200, {
      status: verifiedTransaction.status || result.transaction.status,
      transaction: result.transaction,
      receipt: result.receipt,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("verify-paystack-payment error:", error);
    return jsonResponse(500, { error: "Unable to verify payment" });
  }
});
