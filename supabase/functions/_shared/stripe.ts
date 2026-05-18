import { HttpError } from "./http.ts";

const STRIPE_API_BASE = "https://api.stripe.com";

export interface StripeCheckoutInput {
  amountMinor: number;
  currency: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  productName: string;
  mode?: "payment" | "subscription";
  priceId?: string;
  metadata?: Record<string, unknown>;
}

export interface StripeRefundInput {
  paymentIntent?: string | null;
  charge?: string | null;
  amountMinor: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StripeTransferInput {
  amountMinor: number;
  currency: string;
  destination: string;
  reference: string;
  transferGroup?: string;
  metadata?: Record<string, unknown>;
}

function getStripeSecretKey() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new HttpError(500, "Missing STRIPE_SECRET_KEY");
  }
  return key;
}

function appendMetadata(params: URLSearchParams, prefix: string, metadata?: Record<string, unknown>) {
  for (const [key, value] of Object.entries(metadata || {})) {
    if (value === undefined || value === null) continue;
    params.append(prefix ? `${prefix}[metadata][${key}]` : `metadata[${key}]`, String(value));
  }
}

async function stripeFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || payload?.error) {
    throw new HttpError(
      response.status || 502,
      payload?.error?.message || "Stripe request failed"
    );
  }

  return payload as T;
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput) {
  const params = new URLSearchParams();
  params.append("mode", input.mode || "payment");
  params.append("client_reference_id", input.reference);
  params.append("customer_email", input.customerEmail);
  params.append("success_url", input.successUrl);
  params.append("cancel_url", input.cancelUrl);
  params.append("metadata[providerReference]", input.reference);
  params.append("metadata[gatewayProvider]", "stripe");
  appendMetadata(params, "", input.metadata);

  if (input.mode === "subscription") {
    if (!input.priceId) throw new HttpError(400, "Stripe priceId is required for subscriptions");
    params.append("line_items[0][price]", input.priceId);
    params.append("line_items[0][quantity]", "1");
    appendMetadata(params, "subscription_data", {
      ...(input.metadata || {}),
      providerReference: input.reference,
      gatewayProvider: "stripe",
    });
  } else {
    params.append("line_items[0][price_data][currency]", input.currency.toLowerCase());
    params.append("line_items[0][price_data][unit_amount]", String(input.amountMinor));
    params.append("line_items[0][price_data][product_data][name]", input.productName);
    params.append("line_items[0][quantity]", "1");
    appendMetadata(params, "payment_intent_data", {
      ...(input.metadata || {}),
      providerReference: input.reference,
      gatewayProvider: "stripe",
    });
  }

  return stripeFetch<{
    id: string;
    url?: string;
    payment_intent?: string | null;
    subscription?: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
  }>("/v1/checkout/sessions", {
    method: "POST",
    body: params,
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeFetch<{
    id: string;
    amount_total?: number;
    currency?: string;
    payment_status?: string;
    status?: string;
    payment_intent?: string | null;
    subscription?: string | null;
    client_reference_id?: string | null;
    customer_details?: {
      email?: string | null;
    } | null;
    metadata?: Record<string, string>;
  }>(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
}

export async function createStripeRefund(input: StripeRefundInput) {
  const params = new URLSearchParams();
  if (input.paymentIntent) params.append("payment_intent", input.paymentIntent);
  if (input.charge) params.append("charge", input.charge);
  params.append("amount", String(input.amountMinor));
  if (input.reason) params.append("metadata[reason]", input.reason);
  appendMetadata(params, "", input.metadata);

  return stripeFetch<{
    id: string;
    amount: number;
    currency: string;
    payment_intent?: string | null;
    charge?: string | null;
    status?: string;
  }>("/v1/refunds", {
    method: "POST",
    body: params,
  });
}

export async function createStripeTransfer(input: StripeTransferInput) {
  const params = new URLSearchParams();
  params.append("amount", String(input.amountMinor));
  params.append("currency", input.currency.toLowerCase());
  params.append("destination", input.destination);
  params.append("metadata[reference]", input.reference);
  if (input.transferGroup) params.append("transfer_group", input.transferGroup);
  appendMetadata(params, "", input.metadata);

  return stripeFetch<{
    id: string;
    amount: number;
    currency: string;
    destination: string;
    transfer_group?: string | null;
  }>("/v1/transfers", {
    method: "POST",
    body: params,
  });
}

export async function verifyStripeWebhookSignature(body: string, signatureHeader: string | null) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${body}`;
  const computedBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(computedBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}
