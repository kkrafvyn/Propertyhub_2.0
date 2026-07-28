import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { retrieveStripeCheckoutSession } from "../_shared/stripe.ts";
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
    await requireAuthenticatedUser(authHeader);
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
    if (transactionError) throw new HttpError(500, transactionError.message);
    if (!transaction) throw new HttpError(404, "Transaction not found");

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
      });
    }

    if (transaction.status === "completed") {
      return jsonResponse(200, {
        status: "completed",
        transaction,
        alreadyProcessed: true,
      });
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

    if (updateError) throw new HttpError(500, updateError.message);

    return jsonResponse(200, {
      status: "completed",
      transaction: updatedTransaction,
      alreadyProcessed: false,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("verify-stripe-payment error:", error);
    return jsonResponse(500, { error: "Unable to verify Stripe payment" });
  }
});
