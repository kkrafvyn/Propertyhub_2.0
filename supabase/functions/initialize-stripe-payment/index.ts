import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createStripeCheckoutSession } from "../_shared/stripe.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

function getAppUrl(req: Request) {
  return (
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("VITE_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    `${new URL(req.url).protocol}//${new URL(req.url).host}`
  ).replace(/\/+$/, "");
}

function parseAmountToMinorUnits(amount: unknown) {
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    return Math.round(amount * 100);
  }

  if (typeof amount === "string") {
    const normalized = Number.parseFloat(amount);
    if (Number.isFinite(normalized) && normalized > 0) {
      return Math.round(normalized * 100);
    }
  }

  throw new HttpError(400, "amount is required and must be greater than zero");
}

function buildReference() {
  return `bm_stripe_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
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

    const listingId =
      typeof requestBody?.listingId === "string" ? requestBody.listingId.trim() : "";
    const purpose =
      typeof requestBody?.purpose === "string" && requestBody.purpose.trim()
        ? requestBody.purpose.trim()
        : "other";

    if (!listingId) {
      throw new HttpError(400, "listingId is required");
    }

    if (!user.email) {
      throw new HttpError(400, "Authenticated user is missing an email address");
    }

    const amountMinor = parseAmountToMinorUnits(requestBody?.amount);
    const admin = createAdminClient();

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, property_id, organization_id, listing_type, price, currency, status")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) throw new HttpError(500, listingError.message);
    if (!listing) throw new HttpError(404, "Listing not found");

    const currency = (listing.currency || "USD").toUpperCase();
    const reference = buildReference();
    const appUrl = getAppUrl(req);
    const metadata = {
      listingId: listing.id,
      propertyId: listing.property_id,
      organizationId: listing.organization_id,
      payerUserId: user.id,
      purpose,
    };

    const { data: propertyTransaction, error: propertyTransactionError } = await admin
      .from("property_transactions")
      .insert({
        listing_id: listing.id,
        property_id: listing.property_id,
        organization_id: listing.organization_id,
        payer_user_id: user.id,
        provider: "stripe",
        provider_reference: reference,
        amount_minor: amountMinor,
        currency,
        purpose,
        status: "initialized",
        metadata,
      })
      .select("*")
      .single();

    if (propertyTransactionError) {
      throw new HttpError(500, propertyTransactionError.message);
    }

    const session = await createStripeCheckoutSession({
      amountMinor,
      currency,
      reference,
      customerEmail: user.email,
      successUrl: `${appUrl}/app/payments`,
      cancelUrl: `${appUrl}/app/payments?cancelled=1`,
      productName: `BaytMiftah payment · ${listing.listing_type || "property"}`,
      metadata: {
        listingId: listing.id,
        propertyId: listing.property_id,
        organizationId: listing.organization_id,
        payerUserId: user.id,
        purpose,
        transactionId: propertyTransaction.id,
      },
    });

    const { data: updatedTransaction, error: updatedTransactionError } = await admin
      .from("property_transactions")
      .update({
        status: "pending",
        authorization_url: session.url,
        access_code: session.id,
      })
      .eq("id", propertyTransaction.id)
      .select("*")
      .single();

    if (updatedTransactionError) {
      throw new HttpError(500, updatedTransactionError.message);
    }

    return jsonResponse(200, {
      transaction: updatedTransaction,
      authorizationUrl: session.url,
      sessionId: session.id,
      reference,
      callbackUrl: `${appUrl}/app/payments`,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("initialize-stripe-payment error:", error);
    return jsonResponse(500, { error: "Unable to initialize Stripe payment" });
  }
});
