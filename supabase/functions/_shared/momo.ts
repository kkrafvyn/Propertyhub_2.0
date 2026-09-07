/**
 * MTN MoMo Ghana API — Shared helper for Collection and Disbursement APIs.
 *
 * Uses the MoMo Open API v1:
 *   Sandbox:    https://sandbox.momodeveloper.mtn.com
 *   Production: https://proxy.momoapi.mtn.com
 *
 * Required env vars (set via supabase secrets):
 *   MTN_MOMO_SUBSCRIPTION_KEY_COLLECTION  — Ocp-Apim-Subscription-Key for Collections product
 *   MTN_MOMO_SUBSCRIPTION_KEY_DISBURSEMENT — Ocp-Apim-Subscription-Key for Disbursements product
 *   MTN_MOMO_API_USER_ID                  — UUID provisioned via API user creation
 *   MTN_MOMO_API_KEY                      — API key for the provisioned user
 *   MTN_MOMO_ENVIRONMENT                  — "sandbox" | "mtnghana" (production)
 *   MTN_MOMO_CALLBACK_URL                 — Edge Function URL: https://<project>.supabase.co/functions/v1/momo-webhook
 *   MTN_MOMO_CALLBACK_SECRET              — HMAC secret required by verifyMomoWebhook
 */

import { HttpError } from "./http.ts";

export function isMomoConfigured(product: "collection" | "disbursement" = "collection"): boolean {
  const subscriptionKey =
    product === "collection"
      ? Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_COLLECTION")
      : Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_DISBURSEMENT");
  return Boolean(
    subscriptionKey?.trim() &&
      Deno.env.get("MTN_MOMO_API_USER_ID")?.trim() &&
      Deno.env.get("MTN_MOMO_API_KEY")?.trim(),
  );
}

// verify/status helpers require live credentials
function requireMomoConfigured(product: "collection" | "disbursement") {
  if (!isMomoConfigured(product)) {
    throw new HttpError(503, "MTN MoMo is not configured");
  }
}

const MOMO_BASE_URL =
  Deno.env.get("MTN_MOMO_ENVIRONMENT") === "sandbox"
    ? "https://sandbox.momodeveloper.mtn.com"
    : "https://proxy.momoapi.mtn.com";

const TARGET_ENVIRONMENT = Deno.env.get("MTN_MOMO_ENVIRONMENT") ?? "sandbox";

// ─────────────────────────────────────────────────────────────
// Access Token
// ─────────────────────────────────────────────────────────────

async function getMomoAccessToken(product: "collection" | "disbursement"): Promise<string> {
  const subscriptionKey =
    product === "collection"
      ? Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_COLLECTION")!
      : Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_DISBURSEMENT")!;

  const apiUserId = Deno.env.get("MTN_MOMO_API_USER_ID")!;
  const apiKey    = Deno.env.get("MTN_MOMO_API_KEY")!;
  const credentials = btoa(`${apiUserId}:${apiKey}`);

  const response = await fetch(`${MOMO_BASE_URL}/${product}/token/`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MoMo token fetch failed [${response.status}]: ${text}`);
  }

  const { access_token } = await response.json() as { access_token: string };
  return access_token;
}

// ─────────────────────────────────────────────────────────────
// Normalise Ghana phone number → international format
// Accepts: 0241234567, +233241234567, 233241234567
// Returns: 233241234567 (no + prefix — MoMo format)
// ─────────────────────────────────────────────────────────────
export function normaliseGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0"))   return `233${digits.slice(1)}`;
  return digits;
}

// ─────────────────────────────────────────────────────────────
// Collections API — Request to Pay (charge a subscriber)
// ─────────────────────────────────────────────────────────────
export interface MomoCollectionParams {
  referenceId:   string;   // UUID v4 — becomes X-Reference-Id
  amount:        string;   // String numeric e.g. "50.00"
  currency:      string;   // "GHS"
  payerMsisdn:   string;   // Ghana phone (normalised internally)
  payerMessage:  string;   // Shown on payer's phone prompt
  payeeNote:     string;   // Internal note
  externalId:    string;   // Your transaction ID for reconciliation
}

export async function initiateMomoCollection(params: MomoCollectionParams): Promise<{ referenceId: string }> {
  if (!isMomoConfigured("collection")) {
    throw new HttpError(503, "MTN MoMo collections are not configured");
  }

  const subscriptionKey = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_COLLECTION")!;
  const callbackUrl     = Deno.env.get("MTN_MOMO_CALLBACK_URL");
  const token           = await getMomoAccessToken("collection");

  const headers: Record<string, string> = {
    "Authorization":            `Bearer ${token}`,
    "X-Reference-Id":           params.referenceId,
    "X-Target-Environment":     TARGET_ENVIRONMENT,
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Content-Type":             "application/json",
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const body = {
    amount:      params.amount,
    currency:    params.currency,
    externalId:  params.externalId,
    payer: {
      partyIdType: "MSISDN",
      partyId:     normaliseGhanaPhone(params.payerMsisdn),
    },
    payerMessage: params.payerMessage,
    payeeNote:    params.payeeNote,
  };

  const response = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(body),
  });

  if (response.status !== 202) {
    const text = await response.text();
    throw new Error(`MoMo collection initiation failed [${response.status}]: ${text}`);
  }

  return { referenceId: params.referenceId };
}

export async function verifyMomoCollection(referenceId: string): Promise<{
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  reason?: string;
}> {
  requireMomoConfigured("collection");
  const subscriptionKey = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_COLLECTION")!;
  const token           = await getMomoAccessToken("collection");

  const response = await fetch(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        "Authorization":            `Bearer ${token}`,
        "X-Target-Environment":     TARGET_ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MoMo collection status check failed [${response.status}]: ${text}`);
  }

  const data = await response.json() as { status: string; reason?: string };
  return {
    status: data.status as "PENDING" | "SUCCESSFUL" | "FAILED",
    reason: data.reason,
  };
}

// ─────────────────────────────────────────────────────────────
// Disbursements API — Transfer to a subscriber (payouts)
// ─────────────────────────────────────────────────────────────
export interface MomoDisbursementParams {
  referenceId:   string;   // UUID v4
  amount:        string;   // String numeric e.g. "200.00"
  currency:      string;   // "GHS"
  payeeMsisdn:   string;   // Recipient Ghana phone
  payerMessage:  string;
  payeeNote:     string;
  externalId:    string;
}

export async function initiateMomoDisbursement(params: MomoDisbursementParams): Promise<{ referenceId: string }> {
  if (!isMomoConfigured("disbursement")) {
    throw new HttpError(503, "MTN MoMo disbursements are not configured");
  }

  const subscriptionKey = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_DISBURSEMENT")!;
  const callbackUrl     = Deno.env.get("MTN_MOMO_CALLBACK_URL");
  const token           = await getMomoAccessToken("disbursement");

  const headers: Record<string, string> = {
    "Authorization":            `Bearer ${token}`,
    "X-Reference-Id":           params.referenceId,
    "X-Target-Environment":     TARGET_ENVIRONMENT,
    "Ocp-Apim-Subscription-Key": subscriptionKey,
    "Content-Type":             "application/json",
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const body = {
    amount:      params.amount,
    currency:    params.currency,
    externalId:  params.externalId,
    payee: {
      partyIdType: "MSISDN",
      partyId:     normaliseGhanaPhone(params.payeeMsisdn),
    },
    payerMessage: params.payerMessage,
    payeeNote:    params.payeeNote,
  };

  const response = await fetch(`${MOMO_BASE_URL}/disbursement/v1_0/transfer`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(body),
  });

  if (response.status !== 202) {
    const text = await response.text();
    throw new Error(`MoMo disbursement initiation failed [${response.status}]: ${text}`);
  }

  return { referenceId: params.referenceId };
}

export async function verifyMomoDisbursement(referenceId: string): Promise<{
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  reason?: string;
}> {
  requireMomoConfigured("disbursement");
  const subscriptionKey = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY_DISBURSEMENT")!;
  const token           = await getMomoAccessToken("disbursement");

  const response = await fetch(
    `${MOMO_BASE_URL}/disbursement/v1_0/transfer/${referenceId}`,
    {
      headers: {
        "Authorization":            `Bearer ${token}`,
        "X-Target-Environment":     TARGET_ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MoMo disbursement status check failed [${response.status}]: ${text}`);
  }

  const data = await response.json() as { status: string; reason?: string };
  return {
    status: data.status as "PENDING" | "SUCCESSFUL" | "FAILED",
    reason: data.reason,
  };
}

export async function verifyMomoWebhook(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get("MTN_MOMO_CALLBACK_SECRET")?.trim();
  if (!secret || !signature) return false;

  const expected = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    new TextEncoder().encode(rawBody),
  );
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const supplied = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  return supplied.length === expectedHex.length &&
    supplied.split("").every((character, index) => character === expectedHex[index]);
}

export { getMomoAccessToken };
