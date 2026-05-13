import { HttpError } from "./http.ts";

const PAYSTACK_API_BASE = "https://api.paystack.co";

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

function getPaystackSecretKey() {
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) {
    throw new HttpError(500, "Missing PAYSTACK_SECRET_KEY");
  }

  return secretKey;
}

export function verifyPaystackWebhookSignature(body: string, signature: string | null) {
  if (!signature) return false;

  const secret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET") || Deno.env.get("PAYSTACK_SECRET_KEY");
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

async function paystackFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
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
      payload?.message || "Paystack request failed"
    );
  }

  return payload.data;
}

export async function initializePaystackTransaction(input: PaystackInitializeInput) {
  return paystackFetch<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackFetch<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
    }
  );
}

export async function createPaystackRefund(input: PaystackCreateRefundInput) {
  return paystackFetch<PaystackRefundData>("/refund", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
