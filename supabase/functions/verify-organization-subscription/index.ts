import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { reconcileOrganizationSubscriptionPayment } from "../_shared/organization-subscription-reconciliation.ts";
import { verifyPaystackTransaction } from "../_shared/paystack.ts";
import { reconcileStripeOrganizationSubscriptionCheckout } from "../_shared/stripe-reconciliation.ts";
import { retrieveStripeCheckoutSession } from "../_shared/stripe.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

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
    const reference = typeof requestBody?.reference === "string" ? requestBody.reference.trim() : "";
    const stripeSessionId =
      typeof requestBody?.stripeSessionId === "string"
        ? requestBody.stripeSessionId.trim()
        : typeof requestBody?.stripe_session_id === "string"
          ? requestBody.stripe_session_id.trim()
          : "";

    if (!reference && !stripeSessionId) {
      throw new HttpError(400, "reference or stripeSessionId is required");
    }

    const admin = createAdminClient();
    let paymentQuery = admin
      .from("organization_subscription_payments")
      .select("id, organization_id, subscription_id, provider, provider_reference, stripe_checkout_session_id");

    if (reference && stripeSessionId) {
      paymentQuery = paymentQuery.or(
        `provider_reference.eq.${reference},stripe_checkout_session_id.eq.${stripeSessionId}`
      );
    } else if (stripeSessionId) {
      paymentQuery = paymentQuery.eq("stripe_checkout_session_id", stripeSessionId);
    } else {
      paymentQuery = paymentQuery.eq("provider_reference", reference);
    }

    const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

    if (paymentError) {
      throw new HttpError(500, paymentError.message);
    }

    if (!payment) {
      throw new HttpError(404, "Subscription payment reference not found");
    }

    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", payment.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new HttpError(500, membershipError.message);
    }

    if (!membership || membership.role !== "owner") {
      throw new HttpError(403, "Only the organization owner can verify subscription billing");
    }

    const result =
      payment.provider === "stripe"
        ? await reconcileStripeOrganizationSubscriptionCheckout(
            await retrieveStripeCheckoutSession(
              stripeSessionId || payment.stripe_checkout_session_id || payment.provider_reference
            ),
            "manual_verify"
          )
        : await reconcileOrganizationSubscriptionPayment({
            reference: payment.provider_reference || reference,
            verifiedTransaction: await verifyPaystackTransaction(payment.provider_reference || reference),
            source: "manual_verify",
          });

    if (!result) {
      throw new HttpError(404, "Subscription payment reference not found");
    }

    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .select("*")
      .eq("id", payment.organization_id)
      .single();

    if (organizationError) {
      throw new HttpError(500, organizationError.message);
    }

    return jsonResponse(200, {
      payment: result.payment,
      subscription: result.subscription,
      organization,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("verify-organization-subscription error:", error);
    return jsonResponse(500, { error: "Unable to verify organization subscription" });
  }
});
