import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { writeServerAuditLog } from "../_shared/audit-log.ts";
import { retrieveStripeCheckoutSession } from "../_shared/stripe.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

async function canVerifyTransaction(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  transaction: { payer_user_id: string; organization_id: string },
) {
  if (transaction.payer_user_id === userId) {
    return true;
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", transaction.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  return membership?.role === "owner" || membership?.role === "manager";
}

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
    const requestBody = await req.json().catch(() => null);

    const sessionId =
      typeof requestBody?.sessionId === "string" ? requestBody.sessionId.trim() : "";
    const reference =
      typeof requestBody?.reference === "string" ? requestBody.reference.trim() : "";

    if (!sessionId && !reference) {
      throw new HttpError(400, "sessionId or reference is required");
    }

    const admin = createAdminClient();
    let transactionQuery = admin.from("property_transactions").select("*").eq("provider", "stripe");

    if (reference) {
      transactionQuery = transactionQuery.eq("provider_reference", reference);
    } else {
      transactionQuery = transactionQuery.eq("access_code", sessionId);
    }

    const { data: transaction, error: transactionError } = await transactionQuery.maybeSingle();
    if (transactionError) throw new HttpError(500, "Unable to load transaction");
    if (!transaction) throw new HttpError(404, "Transaction not found");

    const authorized = await canVerifyTransaction(admin, user.id, transaction);
    if (!authorized) {
      throw new HttpError(403, "You are not allowed to verify this payment");
    }

    const resolvedSessionId = sessionId || transaction.access_code;
    if (!resolvedSessionId) {
      throw new HttpError(400, "Stripe session id is missing");
    }

    const session = await retrieveStripeCheckoutSession(resolvedSessionId);
    const paid = session.payment_status === "paid" || session.status === "complete";

    if (!paid) {
      return jsonResponse(200, {
        status: session.payment_status || session.status || "pending",
        transaction,
        alreadyProcessed: transaction.status === "completed",
      }, req);
    }

    if (transaction.status === "completed") {
      return jsonResponse(200, {
        status: "completed",
        transaction,
        alreadyProcessed: true,
      }, req);
    }

    const { data: updatedTransaction, error: updateError } = await admin
      .from("property_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .select("*")
      .single();

    if (updateError) throw new HttpError(500, "Unable to update transaction");

    await writeServerAuditLog({
      actorUserId: user.id,
      action: "stripe_payment_verified",
      entityType: "property_transaction",
      entityId: transaction.id,
      details: { reference: transaction.provider_reference },
    });

    return jsonResponse(200, {
      status: "completed",
      transaction: updatedTransaction,
      alreadyProcessed: false,
    }, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }

    console.error("verify-stripe-payment error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Unable to verify Stripe payment") }, req);
  }
});
