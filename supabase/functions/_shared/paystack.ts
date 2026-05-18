import { HttpError } from "./http.ts";

const PAYSTACK_API_BASE = "https://api.paystack.co";

export interface PaystackInitializeInput {
  amount: string;
  email: string;
  currency: string;
  reference: string;
  callback_url: string;
  plan?: string;
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
  fees?: number | null;
  authorization?: {
    authorization_code?: string;
    reusable?: boolean;
    channel?: string;
  } | null;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  plan?: {
    plan_code?: string;
    name?: string;
    amount?: number;
    interval?: string;
  } | null;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface PaystackSubscriptionData {
  id?: number | string;
  status?: string;
  amount?: number;
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customer?:
    | {
        email?: string;
        customer_code?: string;
      }
    | number
    | string;
  plan?:
    | {
        plan_code?: string;
        amount?: number;
        currency?: string;
        interval?: string;
      }
    | number
    | string;
}

export interface PaystackInvoiceWebhookData {
  invoice_code?: string;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    status?: string;
    next_payment_date?: string | null;
  };
  transaction?: {
    reference?: string;
    amount?: number;
    paid_at?: string | null;
    status?: string;
  } | null;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  amount?: number;
  currency?: string;
  status?: string;
  paid?: boolean;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface PaystackCreateRefundInput {
  transaction: string | number;
  amount?: number;
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}

export interface PaystackCreateTransferInput {
  source?: "balance";
  amount: number;
  recipient: string;
  reason: string;
  reference: string;
  currency?: string;
}

export interface PaystackTransferData {
  id?: number | string;
  amount?: number;
  currency?: string;
  reference?: string;
  transfer_code?: string;
  status?: string;
  reason?: string;
  recipient?: string | number | Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
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

  if (!response.ok || !payload?.status) {
    throw new HttpError(
      response.status || 502,
      payload?.message || "Paystack request failed"
    );
  }

  return (payload.data || {}) as T;
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

export async function createPaystackTransfer(input: PaystackCreateTransferInput) {
  return paystackFetch<PaystackTransferData>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: input.source || "balance",
      amount: input.amount,
      recipient: input.recipient,
      reason: input.reason,
      reference: input.reference,
      currency: input.currency || "GHS",
    }),
  });
}

export async function fetchPaystackSubscription(idOrCode: string) {
  return paystackFetch<PaystackSubscriptionData>(
    `/subscription/${encodeURIComponent(idOrCode)}`,
    {
      method: "GET",
    }
  );
}

export async function disablePaystackSubscription(input: {
  code: string;
  token: string;
}) {
  return paystackFetch<Record<string, never>>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function enablePaystackSubscription(input: {
  code: string;
  token: string;
}) {
  return paystackFetch<Record<string, never>>("/subscription/enable", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function generatePaystackSubscriptionManageLink(code: string) {
  return paystackFetch<{ link: string }>(
    `/subscription/${encodeURIComponent(code)}/manage/link`,
    {
      method: "GET",
    }
  );
}
