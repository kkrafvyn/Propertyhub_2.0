import { HttpError } from "./http.ts";
import {
  initializePaystackTransaction,
  type PaystackTransactionData,
  verifyPaystackTransaction,
} from "./paystack.ts";
import {
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
} from "./stripe.ts";

export const PAYMENT_GATEWAY_PROVIDERS = [
  "paystack",
  "stripe",
  "flutterwave",
  "it_consortium",
] as const;

export type PaymentGatewayProvider = (typeof PAYMENT_GATEWAY_PROVIDERS)[number];

export type PaymentGatewayTransactionData = PaystackTransactionData & {
  status?: string;
  id?: number | string;
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
};

interface GatewayInitializeInput {
  provider: PaymentGatewayProvider;
  amountMinor: number;
  email: string;
  currency: string;
  reference: string;
  callbackUrl: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface FlutterwaveSubscriptionPaymentInput {
  amountMinor: number;
  email: string;
  currency: string;
  reference: string;
  callbackUrl: string;
  paymentPlanId: string | number;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayInitializeResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
  providerTransactionId?: string;
  raw: Record<string, unknown>;
}

type FlutterwavePaymentResponse = {
  link?: string;
  id?: number | string;
  tx_ref?: string;
};

type FlutterwaveTransactionResponse = {
  id?: number | string;
  tx_ref?: string;
  flw_ref?: string;
  status?: string;
  amount?: number | string;
  charged_amount?: number | string;
  currency?: string;
  payment_type?: string;
  processor_response?: string;
  created_at?: string;
  customer?: {
    email?: string;
  };
  meta?: Record<string, unknown>;
};

type FlutterwaveRefundResponse = {
  id?: number | string;
  transaction_id?: number | string;
  tx_ref?: string;
  flw_ref?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  comments?: string;
  created_at?: string;
};

type FlutterwaveTransferResponse = {
  id?: number | string;
  reference?: string;
  status?: string;
  complete_message?: string;
  amount?: number | string;
  currency?: string;
  account_number?: string;
  account_bank?: string;
  bank_name?: string;
  fullname?: string;
  created_at?: string;
};

function getEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : "";
}

function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new HttpError(500, `Missing ${name}`);
  }

  return value;
}

function uniqueProviders(providers: PaymentGatewayProvider[]) {
  return providers.filter((provider, index) => providers.indexOf(provider) === index);
}

export function isPaymentGatewayConfigured(provider: PaymentGatewayProvider) {
  if (provider === "paystack") return Boolean(getEnv("PAYSTACK_SECRET_KEY"));
  if (provider === "stripe") return Boolean(getEnv("STRIPE_SECRET_KEY"));
  if (provider === "flutterwave") return Boolean(getEnv("FLUTTERWAVE_SECRET_KEY"));
  return Boolean(getEnv("IT_CONSORTIUM_MERCHANT_ID") && getEnv("IT_CONSORTIUM_API_KEY"));
}

export function getPaymentGatewayFallbackOrder(input: {
  primaryProvider: PaymentGatewayProvider;
  currency?: string | null;
  fallbackProviders?: PaymentGatewayProvider[];
  enableFallback?: boolean;
}) {
  if (input.enableFallback === false) return [input.primaryProvider];

  const defaultFallbackProviders: PaymentGatewayProvider[] = [
    "paystack",
    "stripe",
    "flutterwave",
    "it_consortium",
  ];

  const requestedOrder = uniqueProviders([
    input.primaryProvider,
    ...(input.fallbackProviders?.length
      ? input.fallbackProviders
      : defaultFallbackProviders),
  ]);

  const primaryAndConfiguredFallbacks = requestedOrder.filter(
    (provider, index) => index === 0 || isPaymentGatewayConfigured(provider)
  );

  return primaryAndConfiguredFallbacks.length ? primaryAndConfiguredFallbacks : requestedOrder;
}

export function normalizePaymentGatewayProvider(value: unknown): PaymentGatewayProvider {
  if (typeof value !== "string") return "paystack";

  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (PAYMENT_GATEWAY_PROVIDERS.includes(normalized as PaymentGatewayProvider)) {
    return normalized as PaymentGatewayProvider;
  }

  throw new HttpError(400, "Unsupported payment gateway");
}

export function getPaymentGatewayLabel(provider: PaymentGatewayProvider | string) {
  switch (provider) {
    case "flutterwave":
      return "Flutterwave";
    case "stripe":
      return "Stripe";
    case "it_consortium":
      return "IT Consortium";
    default:
      return "Paystack";
  }
}

async function flutterwaveFetch<T>(path: string, init: RequestInit = {}) {
  const apiBase = getEnv("FLUTTERWAVE_API_BASE_URL") || "https://api.flutterwave.com";
  const response = await fetch(`${apiBase.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; data?: T }
    | null;

  if (!response.ok || !payload?.data) {
    throw new HttpError(
      response.status || 502,
      payload?.message || "Flutterwave request failed"
    );
  }

  return payload.data;
}

function majorAmountToMinor(amount: unknown) {
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount || ""));
  if (!Number.isFinite(numericAmount)) return undefined;
  return Math.round(numericAmount * 100);
}

function minorAmountToMajor(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

function normalizeFlutterwaveStatus(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "successful":
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "cancelled":
    case "canceled":
      return "abandoned";
    default:
      return "pending";
  }
}

async function initializeFlutterwavePayment(input: GatewayInitializeInput) {
  const data = await flutterwaveFetch<FlutterwavePaymentResponse>("/v3/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: (input.amountMinor / 100).toFixed(2),
      currency: input.currency,
      redirect_url: input.callbackUrl,
      payment_options: "card,mobilemoneyghana,banktransfer,ussd",
      customer: {
        email: input.email,
        name: input.customerName || input.email,
        phonenumber: input.customerPhone || undefined,
      },
      customizations: {
        title: "BaytMiftah Property Payment",
        description: input.description || "Secure property payment",
      },
      meta: input.metadata,
    }),
  });

  if (!data.link) {
    throw new HttpError(502, "Flutterwave did not return a checkout link");
  }

  return {
    authorizationUrl: data.link,
    reference: data.tx_ref || input.reference,
    providerTransactionId: data.id !== undefined ? String(data.id) : undefined,
    raw: data as Record<string, unknown>,
  };
}

export async function initializeFlutterwaveSubscriptionPayment(
  input: FlutterwaveSubscriptionPaymentInput
) {
  const data = await flutterwaveFetch<FlutterwavePaymentResponse>("/v3/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: (input.amountMinor / 100).toFixed(2),
      currency: input.currency,
      redirect_url: input.callbackUrl,
      payment_plan: input.paymentPlanId,
      payment_options: "card",
      customer: {
        email: input.email,
        name: input.customerName || input.email,
        phonenumber: input.customerPhone || undefined,
      },
      customizations: {
        title: "BaytMiftah Subscription",
        description: input.description || "BaytMiftah workspace subscription",
      },
      meta: {
        ...(input.metadata || {}),
        gatewayProvider: "flutterwave",
        providerReference: input.reference,
      },
    }),
  });

  if (!data.link) {
    throw new HttpError(502, "Flutterwave did not return a subscription checkout link");
  }

  return {
    authorizationUrl: data.link,
    reference: data.tx_ref || input.reference,
    providerTransactionId: data.id !== undefined ? String(data.id) : undefined,
    raw: data as Record<string, unknown>,
  };
}

async function initializeStripePayment(input: GatewayInitializeInput) {
  const successUrl = new URL(input.callbackUrl);
  successUrl.searchParams.set("stripe_session_id", "{CHECKOUT_SESSION_ID}");

  const checkout = await createStripeCheckoutSession({
    amountMinor: input.amountMinor,
    currency: input.currency,
    reference: input.reference,
    successUrl: successUrl.toString(),
    cancelUrl: input.callbackUrl,
    customerEmail: input.email,
    productName: input.description || "BaytMiftah property payment",
    metadata: input.metadata,
  });

  if (!checkout.url) {
    throw new HttpError(502, "Stripe did not return a checkout link");
  }

  return {
    authorizationUrl: checkout.url,
    reference: input.reference,
    providerTransactionId: checkout.id,
    raw: checkout as Record<string, unknown>,
  };
}

export async function verifyStripeTransaction(sessionId: string) {
  const session = await retrieveStripeCheckoutSession(sessionId);
  const status = session.payment_status === "paid" ? "success" : session.status === "expired" ? "abandoned" : "pending";
  const providerReference =
    session.metadata?.providerReference || session.client_reference_id || session.id;

  return {
    id: session.payment_intent || session.id,
    status,
    reference: providerReference,
    amount: session.amount_total,
    currency: session.currency?.toUpperCase(),
    channel: "stripe_checkout",
    gateway_response: session.payment_status || session.status,
    paid_at: status === "success" ? new Date().toISOString() : null,
    customer: {
      email: session.customer_details?.email || undefined,
    },
    metadata: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      stripeSubscriptionId: session.subscription,
      raw: session,
    },
  } satisfies PaymentGatewayTransactionData;
}

export async function verifyFlutterwaveTransaction(reference: string) {
  const data = await flutterwaveFetch<FlutterwaveTransactionResponse>(
    `/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    {
      method: "GET",
    }
  );

  return {
    id: data.id,
    status: normalizeFlutterwaveStatus(data.status),
    reference: data.tx_ref || reference,
    amount: majorAmountToMinor(data.charged_amount ?? data.amount),
    currency: data.currency,
    channel: data.payment_type,
    gateway_response: data.processor_response || data.status,
    paid_at: data.created_at || null,
    customer: {
      email: data.customer?.email,
    },
    metadata: {
      flwRef: data.flw_ref,
      raw: data,
    },
  } satisfies PaymentGatewayTransactionData;
}

export async function createFlutterwaveRefund(input: {
  transactionId: string | number;
  amountMinor?: number;
  reason?: string;
  callbackUrl?: string;
}) {
  const body: Record<string, unknown> = {};
  if (input.amountMinor !== undefined) body.amount = minorAmountToMajor(input.amountMinor);
  if (input.reason) body.comments = input.reason;
  if (input.callbackUrl) body.callbackurl = input.callbackUrl;

  return flutterwaveFetch<FlutterwaveRefundResponse>(
    `/v3/transactions/${encodeURIComponent(String(input.transactionId))}/refund`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function createFlutterwaveTransfer(input: {
  amountMinor: number;
  currency: string;
  reference: string;
  narration: string;
  accountBank?: string | null;
  accountNumber?: string | null;
  beneficiary?: string | number | null;
  beneficiaryName?: string | null;
  destinationBranchCode?: string | null;
  debitSubaccount?: string | null;
  debitCurrency?: string | null;
  callbackUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const hasBankRecipient = Boolean(input.accountBank && input.accountNumber);
  if (!hasBankRecipient && !input.beneficiary) {
    throw new HttpError(
      400,
      "Flutterwave transfer requires either beneficiary ID or bank recipient details"
    );
  }
  const accountBank = input.accountBank || (input.beneficiary ? "flutterwave" : undefined);
  const accountNumber = input.accountNumber || (input.beneficiary ? String(input.beneficiary) : undefined);

  return flutterwaveFetch<FlutterwaveTransferResponse>("/v3/transfers", {
    method: "POST",
    body: JSON.stringify({
      account_bank: accountBank,
      account_number: accountNumber,
      beneficiary_name: input.beneficiaryName || undefined,
      destination_branch_code: input.destinationBranchCode || undefined,
      debit_subaccount: input.debitSubaccount || undefined,
      debit_currency: input.debitCurrency || undefined,
      amount: minorAmountToMajor(input.amountMinor),
      currency: input.currency,
      reference: input.reference,
      narration: input.narration,
      callback_url: input.callbackUrl || undefined,
      meta: input.metadata,
    }),
  });
}

function getTheTellerCheckoutBaseUrl() {
  return (
    getEnv("IT_CONSORTIUM_CHECKOUT_BASE_URL") ||
    (getEnv("IT_CONSORTIUM_ENVIRONMENT").toLowerCase() === "live"
      ? "https://checkout.theteller.net"
      : "https://checkout-test.theteller.net")
  ).replace(/\/+$/, "");
}

function getTheTellerApiBaseUrl() {
  return (
    getEnv("IT_CONSORTIUM_API_BASE_URL") ||
    (getEnv("IT_CONSORTIUM_ENVIRONMENT").toLowerCase() === "live"
      ? "https://prod.theteller.net"
      : "https://test.theteller.net")
  ).replace(/\/+$/, "");
}

function getTheTellerAuthHeader() {
  const merchantId = requireEnv("IT_CONSORTIUM_MERCHANT_ID");
  const apiKey = requireEnv("IT_CONSORTIUM_API_KEY");
  const username = getEnv("IT_CONSORTIUM_USERNAME") || merchantId;

  return {
    merchantId,
    authorization: `Basic ${btoa(`${username}:${apiKey}`)}`,
  };
}

async function initializeTheTellerPayment(input: GatewayInitializeInput) {
  const { merchantId, authorization } = getTheTellerAuthHeader();
  const response = await fetch(`${getTheTellerCheckoutBaseUrl()}/initiate`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      transaction_id: input.reference,
      desc: input.description || "BaytMiftah property payment",
      amount: String(input.amountMinor).padStart(12, "0"),
      redirect_url: input.callbackUrl,
      email: input.email,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        checkout_url?: string;
        checkoutUrl?: string;
        url?: string;
        data?: {
          checkout_url?: string;
          checkoutUrl?: string;
          url?: string;
        };
        message?: string;
      }
    | null;

  const authorizationUrl =
    payload?.checkout_url ||
    payload?.checkoutUrl ||
    payload?.url ||
    payload?.data?.checkout_url ||
    payload?.data?.checkoutUrl ||
    payload?.data?.url;

  if (!response.ok || !authorizationUrl) {
    throw new HttpError(
      response.status || 502,
      payload?.message ||
        "IT Consortium checkout is configured, but no hosted checkout URL was returned"
    );
  }

  return {
    authorizationUrl,
    reference: input.reference,
    raw: payload as Record<string, unknown>,
  };
}

function normalizeTheTellerStatus(status?: string, code?: string) {
  const normalizedStatus = (status || "").toLowerCase();
  if (code === "000" || ["approved", "success", "successful"].includes(normalizedStatus)) {
    return "success";
  }
  if (["declined", "failed"].includes(normalizedStatus)) return "failed";
  if (["cancelled", "canceled"].includes(normalizedStatus)) return "abandoned";
  return "pending";
}

async function verifyTheTellerTransaction(reference: string) {
  const { merchantId, authorization } = getTheTellerAuthHeader();
  const response = await fetch(
    `${getTheTellerApiBaseUrl()}/v1.1/users/transactions/${encodeURIComponent(
      reference
    )}/status`,
    {
      method: "GET",
      headers: {
        Authorization: authorization,
        "Merchant-Id": merchantId,
      },
    }
  );

  const data = (await response.json().catch(() => null)) as
    | {
        code?: string;
        status?: string;
        transaction_id?: string;
        amount?: number | string;
        currency?: string;
        reason?: string;
        payment_type?: string;
        subscriber_number?: string;
      }
    | null;

  if (!response.ok || !data) {
    throw new HttpError(response.status || 502, data?.reason || "IT Consortium verification failed");
  }

  return {
    id: data.transaction_id || reference,
    status: normalizeTheTellerStatus(data.status, data.code),
    reference: data.transaction_id || reference,
    amount: majorAmountToMinor(data.amount),
    currency: data.currency,
    channel: data.payment_type || data.subscriber_number,
    gateway_response: data.reason || data.status,
    paid_at: new Date().toISOString(),
    metadata: {
      raw: data,
    },
  } satisfies PaymentGatewayTransactionData;
}

export async function initializeGatewayPayment(input: GatewayInitializeInput) {
  if (input.provider === "paystack") {
    const paystack = await initializePaystackTransaction({
      amount: String(input.amountMinor),
      email: input.email,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["mobile_money", "card", "bank_transfer", "bank"],
      metadata: input.metadata,
    });

    return {
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      reference: paystack.reference,
      raw: paystack as Record<string, unknown>,
    };
  }

  if (input.provider === "stripe") {
    return initializeStripePayment(input);
  }

  if (input.provider === "flutterwave") {
    return initializeFlutterwavePayment(input);
  }

  return initializeTheTellerPayment(input);
}

export async function verifyGatewayTransaction(
  provider: PaymentGatewayProvider,
  reference: string
) {
  if (provider === "paystack") return verifyPaystackTransaction(reference);
  if (provider === "stripe") return verifyStripeTransaction(reference);
  if (provider === "flutterwave") return verifyFlutterwaveTransaction(reference);
  return verifyTheTellerTransaction(reference);
}

export function verifyFlutterwaveWebhookSignature(signature: string | null) {
  const secretHash = getEnv("FLUTTERWAVE_WEBHOOK_SECRET_HASH") || getEnv("FLUTTERWAVE_WEBHOOK_SECRET");
  if (!secretHash || !signature) return false;
  return signature === secretHash;
}
