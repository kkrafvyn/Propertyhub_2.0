import { HttpError } from "./http.ts";

function getPayangelsApiBase() {
  const configured = Deno.env.get("PAYANGELS_API_BASE")?.trim();
  if (!configured) {
    throw new HttpError(503, "PayAngel API endpoint is not configured");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new HttpError(503, "PayAngel API endpoint is invalid");
  }
  if (url.protocol !== "https:" || /(^|\.)paystack\.co$/i.test(url.hostname)) {
    throw new HttpError(503, "PayAngel API endpoint is not verified");
  }
  return configured.replace(/\/$/, "");
}

function isPayangelsContractVerified() {
  return /^(1|true|yes)$/i.test(
    Deno.env.get("PAYANGELS_API_CONTRACT_VERIFIED")?.trim() || "",
  );
}

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
  const secretKey = Deno.env.get("PAYANGELS_SECRET_KEY")?.trim();
  if (!secretKey) {
    throw new HttpError(503, "Checkout is not configured");
  }

  return secretKey;
}

export function isPayangelsConfigured() {
  if (!Deno.env.get("PAYANGELS_SECRET_KEY")?.trim() || !isPayangelsContractVerified()) {
    return false;
  }
  try {
    getPayangelsApiBase();
    return true;
  } catch {
    return false;
  }
}

function timingSafeEqualHex(a: string, b: string) {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function normalizeWebhookSignature(signature: string) {
  const trimmed = signature.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("sha512=")) return trimmed.slice(7).trim();
  if (lower.startsWith("sha256=")) return trimmed.slice(7).trim();
  return trimmed;
}

async function hmacHex(body: string, secret: string, algorithm: "SHA-512" | "SHA-256") {
  const data = new TextEncoder().encode(body);
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function verifyPayangelsWebhookSignature(body: string, signature: string | null) {
  if (!signature) return Promise.resolve(false);

  const secret = Deno.env.get("PAYANGELS_WEBHOOK_SECRET")?.trim();
  if (!secret) return Promise.resolve(false);

  const normalized = normalizeWebhookSignature(signature);

  return Promise.all([
    hmacHex(body, secret, "SHA-512"),
    hmacHex(body, secret, "SHA-256"),
  ]).then(([sha512, sha256]) =>
    timingSafeEqualHex(sha512, normalized) || timingSafeEqualHex(sha256, normalized)
  );
}

async function payangelsFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getPayangelsApiBase()}${path}`, {
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
