import { HttpError } from "./http.ts";

const PAYANGELS_API_BASE = "https://api.payangels.com";
const STRIPE_API_BASE = "https://api.payangels.com/v1";

export interface PaystackInitializeInput {
  amount: string;
  email: string;
  currency: string;
  reference: string;
  callback_url: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaystackTransactionData {
  id?: number | string;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  gateway_response?: string;
  paid_at?: string | null;
  customer?: {
    email?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PaystackCreateRefundInput {
  transaction: string | number;
  amount?: number;
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}

export interface PaystackRefundData {
  id?: number | string;
  integration?: number;
  domain?: string;
  currency?: string;
  amount?: number;
  status?: string;
  refunded_at?: string | null;
  refunded_by?: string | null;
  expected_at?: string | null;
  customer_note?: string | null;
  merchant_note?: string | null;
  deducted_amount?: number | null;
  fully_deducted?: boolean | null;
  bank_reference?: string | null;
  processor?: string | null;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  refund_reference?: string | null;
  transaction?:
    | {
        id?: number | string;
        reference?: string;
        amount?: number;
        paid_at?: string | null;
        paidAt?: string | null;
        channel?: string | null;
        currency?: string;
      }
    | number
    | string;
  customer?: {
    email?: string;
  } | null;
}

export interface PaystackRefundWebhookData {
  id?: number | string;
  status?: string;
  transaction_reference?: string;
  refund_reference?: string | null;
  amount?: string | number;
  currency?: string;
  processor?: string | null;
  expected_at?: string | null;
  refunded_at?: string | null;
  customer_note?: string | null;
  merchant_note?: string | null;
  reason?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  integration?: number;
  domain?: string;
}

function getPayangelsSecretKey() {
  const secretKey =
    Deno.env.get("PAYANGELS_SECRET_KEY")?.trim() ||
    Deno.env.get("PAYSTACK_SECRET_KEY")?.trim() ||
    Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!secretKey) {
    throw new HttpError(503, "Checkout is not configured");
  }

  return secretKey;
}

export function isPayangelsConfigured() {
  return Boolean(
    Deno.env.get("PAYANGELS_SECRET_KEY")?.trim() ||
      Deno.env.get("PAYSTACK_SECRET_KEY")?.trim() ||
      Deno.env.get("STRIPE_SECRET_KEY")?.trim()
  );
}

export function verifyPayangelsWebhookSignature(body: string, signature: string | null) {
  if (!signature) return false;

  const secret =
    Deno.env.get("PAYANGELS_WEBHOOK_SECRET") ||
    Deno.env.get("PAYANGELS_SECRET_KEY") ||
    Deno.env.get("PAYSTACK_WEBHOOK_SECRET") ||
    Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return false;

  const data = new TextEncoder().encode(body);
  const keyData = new TextEncoder().encode(secret);

  return crypto.subtle
    .importKey("raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, data))
    .then((signatureBuffer) => {
      const computed = Array.from(new Uint8Array(signatureBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      return computed === signature;
    });
}

async function payangelsFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${PAYANGELS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPayangelsSecretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: T }
    | null;

  if (!response.ok || !payload?.status || !payload.data) {
    throw new HttpError(
      response.status || 502,
      payload?.message || "Payment request failed"
    );
  }

  return payload.data;
}

export async function initializePayangelsTransaction(input: PaystackInitializeInput) {
  if (!isPayangelsConfigured()) {
    throw new HttpError(503, "Checkout is not configured");
  }
  return payangelsFetch<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyPayangelsTransaction(reference: string) {
  if (!isPayangelsConfigured()) {
    throw new HttpError(503, "Payment verification is not configured");
  }
  return payangelsFetch<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
    }
  );
}

export async function createPayangelsRefund(input: PaystackCreateRefundInput) {
  return payangelsFetch<PaystackRefundData>("/refund", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function encodeFormBody(values: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export async function createStripeCheckoutSession(input: {
  amountMinor: number;
  currency: string;
  reference: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  productName: string;
  metadata: Record<string, string>;
}) {
  const body = encodeFormBody({
    mode: "payment",
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}&reference=${input.reference}`,
    cancel_url: input.cancelUrl,
    client_reference_id: input.reference,
    customer_email: input.customerEmail,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": input.amountMinor,
    "line_items[0][price_data][product_data][name]": input.productName,
    ...Object.fromEntries(
      Object.entries(input.metadata).map(([key, value]) => [`metadata[${key}]`, value])
    ),
  });

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPayangelsSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.message || "Checkout session failed");
  }

  return payload as {
    id: string;
    url: string;
    payment_status?: string;
    status?: string;
  };
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${getPayangelsSecretKey()}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.message || "Payment session lookup failed");
  }

  return payload as {
    id: string;
    payment_status?: string;
    status?: string;
    client_reference_id?: string;
    amount_total?: number;
    currency?: string;
  };
}
