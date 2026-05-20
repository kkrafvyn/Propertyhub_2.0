import { HttpError } from "./http.ts";
import type { PaystackRefundData, PaystackRefundWebhookData } from "./paystack.ts";
import { createAdminClient } from "./supabase.ts";

type RefundStatus =
  | "pending"
  | "processing"
  | "needs_attention"
  | "failed"
  | "processed";

type RefundProvider = "paystack" | "stripe" | "flutterwave";

type PropertyTransactionSummaryRow = {
  id: string;
  provider_reference: string;
  amount_minor: number;
  refunded_amount_minor: number;
  currency: string;
  organization_id: string;
  property_id: string;
};

type PropertyRefundRow = {
  id: string;
  transaction_id: string;
  organization_id: string;
  property_id: string;
  requested_by_user_id: string | null;
  provider: RefundProvider;
  provider_refund_id: string | null;
  provider_refund_reference: string | null;
  amount_minor: number;
  currency: string;
  refund_type: "partial" | "full";
  status: RefundStatus;
  refund_reason: string;
  customer_note: string | null;
  merchant_note: string | null;
  processor: string | null;
  expected_at: string | null;
  processed_at: string | null;
  failed_at: string | null;
  paystack_response: Record<string, unknown>;
  provider_response?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function normalizePaystackRefundStatus(status?: string | null): RefundStatus {
  switch ((status || "").trim().toLowerCase().replace(/-/g, "_")) {
    case "processing":
      return "processing";
    case "needs_attention":
      return "needs_attention";
    case "failed":
      return "failed";
    case "processed":
      return "processed";
    default:
      return "pending";
  }
}

export function normalizeGatewayRefundStatus(
  provider: RefundProvider,
  status?: string | null
): RefundStatus {
  const normalized = (status || "").trim().toLowerCase().replace(/[-\s]+/g, "_");

  if (provider === "paystack") return normalizePaystackRefundStatus(status);

  if (provider === "stripe") {
    if (normalized === "succeeded") return "processed";
    if (["failed", "canceled", "cancelled"].includes(normalized)) return "failed";
    return "processing";
  }

  if (["successful", "success", "completed", "processed"].includes(normalized)) {
    return "processed";
  }
  if (["failed", "cancelled", "canceled"].includes(normalized)) return "failed";
  if (["processing", "pending"].includes(normalized)) return "processing";
  return "pending";
}

export function isActiveRefundStatus(status?: string | null) {
  return ["pending", "processing", "needs_attention"].includes(status || "");
}

function parseMinorAmount(amount: string | number | null | undefined) {
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    return Math.round(amount);
  }

  if (typeof amount === "string") {
    const normalized = Number.parseInt(amount, 10);
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
}

function toIsoOrNull(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getRefundReference(refund: PaystackRefundData) {
  if ("refund_reference" in refund && typeof refund.refund_reference === "string") {
    return refund.refund_reference;
  }

  return null;
}

function getTransactionReferenceFromRefund(refund: PaystackRefundData) {
  if (typeof refund.transaction === "object" && refund.transaction) {
    return refund.transaction.reference?.trim() || "";
  }

  return "";
}

async function syncPropertyTransactionRefundState(transactionId: string) {
  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from("property_transactions")
    .select("id, amount_minor")
    .eq("id", transactionId)
    .maybeSingle();

  if (transactionError) {
    throw new HttpError(500, transactionError.message);
  }

  if (!transaction) {
    throw new HttpError(404, "Property transaction not found");
  }

  const { data: refunds, error: refundsError } = await admin
    .from("property_refunds")
    .select("status, amount_minor, updated_at")
    .eq("transaction_id", transactionId)
    .order("updated_at", { ascending: false });

  if (refundsError) {
    throw new HttpError(500, refundsError.message);
  }

  const refundRows = (refunds || []) as Pick<
    PropertyRefundRow,
    "status" | "amount_minor" | "updated_at"
  >[];
  const latestRefund = refundRows[0] || null;
  const processedAmountMinor = refundRows.reduce((total, refund) => {
    return refund.status === "processed" ? total + refund.amount_minor : total;
  }, 0);
  const hasActiveRefund = refundRows.some((refund) => isActiveRefundStatus(refund.status));
  const nextTransactionStatus = hasActiveRefund
    ? "reversal_pending"
    : processedAmountMinor >= transaction.amount_minor && processedAmountMinor > 0
      ? "reversed"
      : "success";

  const { data: updatedTransaction, error: updateError } = await admin
    .from("property_transactions")
    .update({
      status: nextTransactionStatus,
      refund_status: latestRefund?.status || null,
      refunded_amount_minor: processedAmountMinor,
    })
    .eq("id", transactionId)
    .select("*")
    .single();

  if (updateError) {
    throw new HttpError(500, updateError.message);
  }

  return updatedTransaction;
}

async function findRefundForWebhook(
  transactionId: string,
  providerRefundId: string | null,
  providerRefundReference: string | null
) {
  const admin = createAdminClient();

  if (providerRefundId) {
    const { data } = await admin
      .from("property_refunds")
      .select("*")
      .eq("transaction_id", transactionId)
      .eq("provider_refund_id", providerRefundId)
      .maybeSingle();

    if (data) return data as PropertyRefundRow;
  }

  if (providerRefundReference) {
    const { data } = await admin
      .from("property_refunds")
      .select("*")
      .eq("transaction_id", transactionId)
      .eq("provider_refund_reference", providerRefundReference)
      .maybeSingle();

    if (data) return data as PropertyRefundRow;
  }

  const { data: activeRefunds } = await admin
    .from("property_refunds")
    .select("*")
    .eq("transaction_id", transactionId)
    .in("status", ["pending", "processing", "needs_attention"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (activeRefunds?.[0]) {
    return activeRefunds[0] as PropertyRefundRow;
  }

  const { data: recentRefunds } = await admin
    .from("property_refunds")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("updated_at", { ascending: false })
    .limit(1);

  return (recentRefunds?.[0] as PropertyRefundRow | undefined) || null;
}

export async function getPropertyRefundSummary(transactionId: string) {
  const admin = createAdminClient();
  const { data: refunds, error } = await admin
    .from("property_refunds")
    .select("id, status, amount_minor, created_at, updated_at")
    .eq("transaction_id", transactionId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message);
  }

  const refundRows = (refunds || []) as Pick<
    PropertyRefundRow,
    "id" | "status" | "amount_minor" | "created_at" | "updated_at"
  >[];
  const processedAmountMinor = refundRows.reduce((total, refund) => {
    return refund.status === "processed" ? total + refund.amount_minor : total;
  }, 0);
  const activeAmountMinor = refundRows.reduce((total, refund) => {
    return isActiveRefundStatus(refund.status) ? total + refund.amount_minor : total;
  }, 0);

  return {
    refunds: refundRows,
    latestRefund: refundRows[0] || null,
    processedAmountMinor,
    activeAmountMinor,
    hasActiveRefund: refundRows.some((refund) => isActiveRefundStatus(refund.status)),
  };
}

export async function recordInitiatedPropertyRefund(input: {
  transactionId: string;
  requestedByUserId: string;
  amountMinor: number;
  refundReason: string;
  customerNote?: string | null;
  merchantNote?: string | null;
  paystackRefund: PaystackRefundData;
}) {
  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from("property_transactions")
    .select("id, provider_reference, amount_minor, refunded_amount_minor, currency, organization_id, property_id")
    .eq("id", input.transactionId)
    .maybeSingle();

  if (transactionError) {
    throw new HttpError(500, transactionError.message);
  }

  if (!transaction) {
    throw new HttpError(404, "Property transaction not found");
  }

  const refundAmountMinor = parseMinorAmount(input.paystackRefund.amount) || input.amountMinor;
  const remainingAmountMinor = Math.max(
    transaction.amount_minor - (transaction.refunded_amount_minor || 0),
    0
  );
  const refundStatus = normalizePaystackRefundStatus(input.paystackRefund.status);
  const providerRefundId =
    input.paystackRefund.id !== undefined ? String(input.paystackRefund.id) : null;
  const nowIso = new Date().toISOString();

  const { data: refund, error: refundError } = await admin
    .from("property_refunds")
    .insert({
      transaction_id: transaction.id,
      organization_id: transaction.organization_id,
      property_id: transaction.property_id,
      requested_by_user_id: input.requestedByUserId,
      provider: "paystack",
      provider_refund_id: providerRefundId,
      provider_refund_reference: getRefundReference(input.paystackRefund),
      amount_minor: refundAmountMinor,
      currency: input.paystackRefund.currency || transaction.currency,
      refund_type: refundAmountMinor >= remainingAmountMinor ? "full" : "partial",
      status: refundStatus,
      refund_reason: input.refundReason,
      customer_note: input.customerNote || input.paystackRefund.customer_note || null,
      merchant_note: input.merchantNote || input.paystackRefund.merchant_note || null,
      processor: input.paystackRefund.processor || null,
      expected_at: toIsoOrNull(input.paystackRefund.expected_at),
      processed_at:
        refundStatus === "processed"
          ? toIsoOrNull(input.paystackRefund.refunded_at) || nowIso
          : null,
      failed_at: refundStatus === "failed" ? nowIso : null,
      paystack_response: input.paystackRefund as Record<string, unknown>,
      metadata: {
        source: "workspace",
        initiated_at: nowIso,
      },
    })
    .select("*")
    .single();

  if (refundError) {
    throw new HttpError(500, refundError.message);
  }

  const updatedTransaction = await syncPropertyTransactionRefundState(transaction.id);

  return {
    transaction: updatedTransaction,
    refund,
  };
}

export async function recordInitiatedGatewayPropertyRefund(input: {
  transactionId: string;
  requestedByUserId: string;
  provider: RefundProvider;
  amountMinor: number;
  refundReason: string;
  customerNote?: string | null;
  merchantNote?: string | null;
  providerRefundId?: string | number | null;
  providerRefundReference?: string | null;
  providerStatus?: string | null;
  providerCurrency?: string | null;
  processor?: string | null;
  expectedAt?: string | null;
  processedAt?: string | null;
  failedAt?: string | null;
  providerResponse: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from("property_transactions")
    .select("id, provider_reference, amount_minor, refunded_amount_minor, currency, organization_id, property_id")
    .eq("id", input.transactionId)
    .maybeSingle();

  if (transactionError) {
    throw new HttpError(500, transactionError.message);
  }

  if (!transaction) {
    throw new HttpError(404, "Property transaction not found");
  }

  const remainingAmountMinor = Math.max(
    transaction.amount_minor - (transaction.refunded_amount_minor || 0),
    0
  );
  const refundStatus = normalizeGatewayRefundStatus(input.provider, input.providerStatus);
  const nowIso = new Date().toISOString();

  const { data: refund, error: refundError } = await admin
    .from("property_refunds")
    .insert({
      transaction_id: transaction.id,
      organization_id: transaction.organization_id,
      property_id: transaction.property_id,
      requested_by_user_id: input.requestedByUserId,
      provider: input.provider,
      provider_refund_id:
        input.providerRefundId !== undefined && input.providerRefundId !== null
          ? String(input.providerRefundId)
          : null,
      provider_refund_reference: input.providerRefundReference || null,
      amount_minor: input.amountMinor,
      currency: input.providerCurrency || transaction.currency,
      refund_type: input.amountMinor >= remainingAmountMinor ? "full" : "partial",
      status: refundStatus,
      refund_reason: input.refundReason,
      customer_note: input.customerNote || null,
      merchant_note: input.merchantNote || null,
      processor: input.processor || input.provider,
      expected_at: toIsoOrNull(input.expectedAt),
      processed_at:
        refundStatus === "processed" ? toIsoOrNull(input.processedAt) || nowIso : null,
      failed_at:
        refundStatus === "failed" ? toIsoOrNull(input.failedAt) || nowIso : null,
      paystack_response: input.provider === "paystack" ? input.providerResponse : {},
      provider_response: input.providerResponse,
      metadata: {
        source: "payment_service",
        initiated_at: nowIso,
        ...(input.metadata || {}),
      },
    })
    .select("*")
    .single();

  if (refundError) {
    throw new HttpError(500, refundError.message);
  }

  const updatedTransaction = await syncPropertyTransactionRefundState(transaction.id);

  return {
    transaction: updatedTransaction,
    refund,
  };
}

export async function reconcilePaystackRefundWebhook(input: {
  event: string;
  refund: PaystackRefundWebhookData;
}) {
  const admin = createAdminClient();
  const reference = input.refund.transaction_reference?.trim();

  if (!reference) {
    throw new HttpError(400, "Refund webhook payload is missing transaction_reference");
  }

  const { data: transaction, error: transactionError } = await admin
    .from("property_transactions")
    .select("id, provider_reference, amount_minor, refunded_amount_minor, currency, organization_id, property_id")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (transactionError) {
    throw new HttpError(500, transactionError.message);
  }

  if (!transaction) {
    throw new HttpError(404, "Refund transaction not found");
  }

  const providerRefundId =
    input.refund.id !== undefined ? String(input.refund.id) : null;
  const providerRefundReference =
    typeof input.refund.refund_reference === "string" && input.refund.refund_reference.trim()
      ? input.refund.refund_reference.trim()
      : null;
  const existingRefund = await findRefundForWebhook(
    transaction.id,
    providerRefundId,
    providerRefundReference
  );
  const refundStatus = normalizePaystackRefundStatus(input.refund.status);
  const remainingAmountMinor = Math.max(
    transaction.amount_minor - (transaction.refunded_amount_minor || 0),
    0
  );
  const parsedAmountMinor = parseMinorAmount(input.refund.amount);
  const amountMinor =
    parsedAmountMinor ||
    existingRefund?.amount_minor ||
    remainingAmountMinor ||
    transaction.amount_minor;
  const nowIso = new Date().toISOString();
  const baseValues = {
    transaction_id: transaction.id,
    organization_id: transaction.organization_id,
    property_id: transaction.property_id,
    requested_by_user_id: existingRefund?.requested_by_user_id || null,
    provider: "paystack" as const,
    provider_refund_id: providerRefundId || existingRefund?.provider_refund_id || null,
    provider_refund_reference:
      providerRefundReference || existingRefund?.provider_refund_reference || null,
    amount_minor: amountMinor,
    currency: input.refund.currency || existingRefund?.currency || transaction.currency,
    refund_type:
      existingRefund?.refund_type ||
      (amountMinor >= remainingAmountMinor ? "full" : "partial"),
    status: refundStatus,
    refund_reason:
      existingRefund?.refund_reason ||
      input.refund.reason ||
      input.refund.customer_note ||
      input.refund.merchant_note ||
      "Refund processed via Paystack",
    customer_note: input.refund.customer_note || existingRefund?.customer_note || null,
    merchant_note: input.refund.merchant_note || existingRefund?.merchant_note || null,
    processor: input.refund.processor || existingRefund?.processor || null,
    expected_at: toIsoOrNull(input.refund.expected_at) || existingRefund?.expected_at || null,
    processed_at:
      refundStatus === "processed"
        ? toIsoOrNull(input.refund.refunded_at) || existingRefund?.processed_at || nowIso
        : existingRefund?.processed_at || null,
    failed_at:
      refundStatus === "failed" ? nowIso : existingRefund?.failed_at || null,
    paystack_response: {
      ...(existingRefund?.paystack_response || {}),
      webhook_event: input.event,
      webhook_payload: input.refund,
    },
    metadata: {
      ...(existingRefund?.metadata || {}),
      last_webhook_event: input.event,
      last_webhook_synced_at: nowIso,
    },
  };

  let refundRow: PropertyRefundRow | null = null;

  if (existingRefund) {
    const { data, error } = await admin
      .from("property_refunds")
      .update(baseValues)
      .eq("id", existingRefund.id)
      .select("*")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    refundRow = data as PropertyRefundRow;
  } else {
    const { data, error } = await admin
      .from("property_refunds")
      .insert(baseValues)
      .select("*")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    refundRow = data as PropertyRefundRow;
  }

  const updatedTransaction = await syncPropertyTransactionRefundState(transaction.id);

  return {
    transaction: updatedTransaction,
    refund: refundRow || existingRefund,
  };
}

export function extractTransactionReferenceFromRefund(refund: PaystackRefundData) {
  return getTransactionReferenceFromRefund(refund);
}
