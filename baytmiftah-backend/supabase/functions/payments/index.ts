import { verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  asString,
  requireListingManager,
  requireObject,
  requireUuid,
} from "../_shared/security.ts";

const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5173";
const boostAmountGhs = Number(Deno.env.get("PAYSTACK_FEATURED_BOOST_AMOUNT_GHS") || "350");

function checkoutUrls(body: Record<string, unknown>) {
  return {
    success_url: asString(body.successUrl) || `${siteUrl}/my-listings?checkout=stripe-success`,
    cancel_url: asString(body.cancelUrl) || `${siteUrl}/my-listings?checkout=stripe-cancelled`,
    callback_url: asString(body.successUrl) || `${siteUrl}/my-listings?checkout=paystack-success`,
  };
}

async function createStripeCheckout(
  body: Record<string, unknown>,
  userEmail: string | undefined,
  listing: { id: string; organization_id?: string | null },
) {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_FEATURED_BOOST_PRICE_ID");
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!priceId) throw new Error("STRIPE_FEATURED_BOOST_PRICE_ID is required");

  const urls = checkoutUrls(body);

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
    "metadata[listing_id]": listing.id,
    "metadata[organization_id]": listing.organization_id || "",
    "metadata[placement]": "featured_boost",
  });

  if (userEmail) {
    params.set("customer_email", userEmail);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Stripe checkout failed");
  return {
    provider: "stripe",
    checkoutUrl: payload.url,
    sessionId: payload.id,
    raw: payload,
  };
}

async function createPaystackCheckout(
  body: Record<string, unknown>,
  userEmail: string | undefined,
  listing: { id: string; organization_id?: string | null },
) {
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  if (!userEmail) throw new Error("A verified account email is required");
  if (!boostAmountGhs || boostAmountGhs <= 0) {
    throw new Error("PAYSTACK_FEATURED_BOOST_AMOUNT_GHS is invalid");
  }

  const urls = checkoutUrls(body);

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: userEmail,
      amount: Math.round(boostAmountGhs * 100),
      currency: "GHS",
      callback_url: urls.callback_url,
      metadata: {
        listing_id: listing.id,
        organization_id: listing.organization_id || "",
        placement: "featured_boost",
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.status) {
    throw new Error(payload?.message || "Paystack checkout failed");
  }

  return {
    provider: "paystack",
    checkoutUrl: payload.data.authorization_url,
    reference: payload.data.reference,
    raw: payload,
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return errorResponse("Method not allowed", 405);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create-checkout";
    if (action !== "create-checkout") return errorResponse("Unknown action", 400);

    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    const body = requireObject(await req.json());
    const provider = body.provider || "stripe";
    if (!["stripe", "paystack"].includes(String(provider))) {
      return errorResponse("Unsupported payment provider", 400);
    }
    const listingId = requireUuid(body.listingId || body.listing_id, "listingId");
    const listing = await requireListingManager(user, listingId);

    if (provider === "paystack") {
      return jsonResponse(await createPaystackCheckout(body, user.email, listing), 201);
    }

    return jsonResponse(await createStripeCheckout(body, user.email, listing), 201);
  } catch (error) {
    return errorResponse(error.message || "Payment checkout failed", 400);
  }
});
