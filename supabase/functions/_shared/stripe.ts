import { HttpError } from "./http.ts";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function getStripeSecretKey() {
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!key) {
    throw new HttpError(503, "Stripe is not configured");
  }
  return key;
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
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.message || "Stripe checkout session failed");
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
      Authorization: `Bearer ${getStripeSecretKey()}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.message || "Stripe session lookup failed");
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
