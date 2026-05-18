import { HttpError } from "./http.ts";
import type {
  PaymentGatewayProvider,
  PaymentGatewayTransactionData,
} from "./payment-gateways.ts";
import { createAdminClient } from "./supabase.ts";

type PropertyTransactionRow = {
  id: string;
  listing_id: string;
  property_id: string;
  organization_id: string;
  deal_case_id: string | null;
  payer_user_id: string;
  provider: string;
  provider_reference: string;
  provider_transaction_id: string | null;
  amount_minor: number;
  currency: string;
  purpose: string;
  status: string;
  payment_channel: string | null;
  authorization_url: string | null;
  access_code: string | null;
  paid_at: string | null;
  gateway_response: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TransactionReceiptRow = {
  id: string;
  transaction_id: string;
  receipt_number: string;
  storage_bucket: string;
  storage_path: string;
  receipt_sha256: string;
  receipt_payload: Record<string, unknown>;
  integrity_status: string;
  integrity_signature: string | null;
  integrity_public_key_id: string | null;
  verification_url: string | null;
  public_verification_token?: string | null;
  verification_payload?: Record<string, unknown> | null;
  verification_pdf_url?: string | null;
  receipt_html?: string | null;
  receipt_pdf_status?: string | null;
  receipt_generated_at?: string | null;
  created_at: string;
  updated_at: string;
};

function minorToMajorString(amountMinor: number, currency: string) {
  const value = amountMinor / 100;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function buildReceiptNumber(reference: string) {
  const suffix = reference.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
  return `BM-${new Date().getFullYear()}-${suffix}`;
}

function buildReceiptPath(organizationId: string, reference: string) {
  const year = new Date().getUTCFullYear();
  return `${organizationId}/${year}/${reference}.txt`;
}

function getPublicAppUrl() {
  return (
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("VITE_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    "https://baytmiftah.com"
  ).replace(/\/+$/, "");
}

function buildPublicVerificationToken() {
  return `bmv_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeStatus(status?: string) {
  switch (status) {
    case "success":
    case "successful":
      return "success";
    case "cancelled":
    case "canceled":
    case "abandoned":
      return "abandoned";
    case "reversed":
      return "reversed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function getDealCaseStageAfterSuccessfulPayment(purpose?: string | null) {
  switch (purpose) {
    case "inspection_fee":
      return {
        pipelineStage: "viewing_scheduled",
        status: "approved",
      } as const;
    case "booking_fee":
    case "deposit":
    case "purchase_installment":
      return {
        pipelineStage: "negotiation",
        status: "approved",
      } as const;
    case "lease_fee":
    case "rent":
      return {
        pipelineStage: "won",
        status: "closed",
      } as const;
    default:
      return {
        pipelineStage: "qualified",
        status: "approved",
      } as const;
  }
}

async function sha256Hex(content: string) {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildReceiptPayload(
  transaction: PropertyTransactionRow,
  gatewayData: PaymentGatewayTransactionData,
  receiptId: string,
  receiptNumber: string
) {
  return {
    receiptId,
    receiptNumber,
    provider: transaction.provider || "paystack",
    providerReference: transaction.provider_reference,
    providerTransactionId:
      transaction.provider_transaction_id || String(gatewayData.id || ""),
    organizationId: transaction.organization_id,
    listingId: transaction.listing_id,
    propertyId: transaction.property_id,
    dealCaseId: transaction.deal_case_id,
    payerUserId: transaction.payer_user_id,
    purpose: transaction.purpose,
    amountMinor: transaction.amount_minor,
    amountFormatted: minorToMajorString(transaction.amount_minor, transaction.currency),
    currency: transaction.currency,
    paymentChannel: gatewayData.channel || transaction.payment_channel,
    gatewayResponse: gatewayData.gateway_response || transaction.gateway_response,
    customerEmail: gatewayData.customer?.email,
    paidAt: gatewayData.paid_at || new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  };
}

function buildReceiptText(payload: ReturnType<typeof buildReceiptPayload>) {
  return [
    "BaytMiftah Payment Receipt",
    `Receipt Number: ${payload.receiptNumber}`,
    `Receipt ID: ${payload.receiptId}`,
    `Provider: ${payload.provider}`,
    `Reference: ${payload.providerReference}`,
    `Provider Transaction ID: ${payload.providerTransactionId || "Unavailable"}`,
    `Organization ID: ${payload.organizationId}`,
    `Listing ID: ${payload.listingId}`,
    `Property ID: ${payload.propertyId}`,
    `Deal Case ID: ${payload.dealCaseId || "N/A"}`,
    `Payer User ID: ${payload.payerUserId}`,
    `Purpose: ${payload.purpose}`,
    `Amount: ${payload.amountFormatted}`,
    `Currency: ${payload.currency}`,
    `Payment Channel: ${payload.paymentChannel || "Unavailable"}`,
    `Gateway Response: ${payload.gatewayResponse || "Unavailable"}`,
    `Customer Email: ${payload.customerEmail || "Unavailable"}`,
    `Paid At: ${payload.paidAt}`,
    `Generated At: ${payload.generatedAt}`,
  ].join("\n");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReceiptHtml(payload: Record<string, unknown>, verificationUrl?: string) {
  const rows = [
    ["Receipt Number", payload.receiptNumber],
    ["Receipt ID", payload.receiptId],
    ["Provider", payload.provider],
    ["Reference", payload.providerReference],
    ["Provider Transaction ID", payload.providerTransactionId || "Unavailable"],
    ["Organization ID", payload.organizationId],
    ["Listing ID", payload.listingId],
    ["Property ID", payload.propertyId],
    ["Deal Case ID", payload.dealCaseId || "N/A"],
    ["Payer User ID", payload.payerUserId],
    ["Purpose", payload.purpose],
    ["Amount", payload.amountFormatted],
    ["Currency", payload.currency],
    ["Payment Channel", payload.paymentChannel || "Unavailable"],
    ["Gateway Response", payload.gatewayResponse || "Unavailable"],
    ["Customer Email", payload.customerEmail || "Unavailable"],
    ["Paid At", payload.paidAt],
    ["Generated At", payload.generatedAt],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BaytMiftah Receipt ${escapeHtml(payload.receiptNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 32px; background: #f8fafc; }
    main { max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 20px; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { width: 36%; color: #374151; background: #f9fafb; }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #ecfdf5; color: #047857; font-weight: 700; }
    .verify { word-break: break-all; font-size: 13px; color: #2563eb; }
    @media print { body { background: white; padding: 0; } main { border: 0; border-radius: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <main>
    <span class="badge">Verified BaytMiftah Receipt</span>
    <h1>Payment Receipt</h1>
    <p>This receipt is generated from BaytMiftah payment records and can be printed or saved as PDF.</p>
    <table>
      <tbody>
        ${rows
          .map(
            ([label, value]) =>
              `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${
      verificationUrl
        ? `<p class="verify">Public verification: ${escapeHtml(verificationUrl)}</p>`
        : ""
    }
  </main>
</body>
</html>`;
}

async function syncDealCasePaymentState(input: {
  dealCaseId: string | null;
  purpose: string | null;
  paidAt?: string | null;
}) {
  if (!input.dealCaseId) return;

  const admin = createAdminClient();
  const nextState = getDealCaseStageAfterSuccessfulPayment(input.purpose);

  const { error } = await admin
    .from("deal_cases")
    .update({
      status: nextState.status,
      pipeline_stage: nextState.pipelineStage,
      next_follow_up_at: null,
      last_contacted_at: input.paidAt || new Date().toISOString(),
      last_stage_updated_at: new Date().toISOString(),
    })
    .eq("id", input.dealCaseId);

  if (error) {
    throw new HttpError(500, error.message);
  }
}

async function logIntegrityEvent(input: {
  organizationId: string;
  actorUserId?: string | null;
  eventType: string;
  subjectType: string;
  subjectId: string;
  hashValue: string;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: previousEvent } = await admin
    .from("integrity_audit_events")
    .select("event_hash")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const eventPayload = {
    ...input.payload,
    hashValue: input.hashValue,
    previousEventHash: previousEvent?.event_hash || null,
    generatedAt: new Date().toISOString(),
  };
  const eventHash = await sha256Hex(JSON.stringify(eventPayload));

  await admin.from("integrity_audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId || null,
    event_type: input.eventType,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    hash_algorithm: "SHA-256",
    hash_value: input.hashValue,
    previous_event_hash: previousEvent?.event_hash || null,
    event_payload: eventPayload,
    event_hash: eventHash,
  });
}

async function publishPublicReceipt(input: {
  admin: any;
  receipt: TransactionReceiptRow;
  transaction: PropertyTransactionRow;
  receiptPayload: Record<string, unknown>;
  receiptHash: string;
  receiptNumber: string;
  provider: string;
  receiptHtml?: string;
}) {
  const publicToken = input.receipt.public_verification_token || buildPublicVerificationToken();
  const verificationUrl = `${getPublicAppUrl()}/verify/${publicToken}`;
  const printUrl = `${verificationUrl}?print=1`;
  const publicPayload = {
    receiptId: input.receipt.id,
    receiptNumber: input.receiptNumber,
    transactionId: input.transaction.id,
    organizationId: input.transaction.organization_id,
    listingId: input.transaction.listing_id,
    propertyId: input.transaction.property_id,
    payerUserId: input.transaction.payer_user_id,
    provider: input.provider,
    providerReference: input.transaction.provider_reference,
    amountMinor: input.transaction.amount_minor,
    currency: input.transaction.currency,
    purpose: input.transaction.purpose,
    receiptSha256: input.receiptHash,
    paidAt: input.receiptPayload.paidAt,
    issuedAt: new Date().toISOString(),
  };
  const payloadHash = await sha256Hex(JSON.stringify(publicPayload));
  const receiptHtml =
    input.receiptHtml || buildReceiptHtml(input.receiptPayload, verificationUrl);

  const { data: updatedReceipt, error: updateError } = await input.admin
    .from("transaction_receipts")
    .update({
      public_verification_token: publicToken,
      verification_payload: publicPayload,
      verification_url: verificationUrl,
      verification_pdf_url: printUrl,
      receipt_html: receiptHtml,
      receipt_pdf_status: "html_ready",
      receipt_generated_at: new Date().toISOString(),
    })
    .eq("id", input.receipt.id)
    .select("*")
    .single();

  if (updateError) {
    throw new HttpError(500, updateError.message);
  }

  const { error: publicReceiptError } = await input.admin
    .from("public_verification_receipts")
    .upsert(
      {
        receipt_id: input.receipt.id,
        organization_id: input.transaction.organization_id,
        public_token: publicToken,
        receipt_type: "payment_receipt",
        title: `BaytMiftah receipt ${input.receiptNumber}`,
        summary: `${input.provider.toUpperCase()} payment receipt for ${minorToMajorString(
          input.transaction.amount_minor,
          input.transaction.currency
        )}.`,
        payload: publicPayload,
        payload_hash: payloadHash,
        rsa_signature: input.receipt.integrity_signature || null,
        public_key_id: input.receipt.integrity_public_key_id || null,
      },
      { onConflict: "public_token" }
    );

  if (publicReceiptError) {
    throw new HttpError(500, publicReceiptError.message);
  }

  return updatedReceipt as TransactionReceiptRow;
}

export async function reconcilePropertyPayment(input: {
  provider?: PaymentGatewayProvider | string;
  reference: string;
  verifiedTransaction: PaymentGatewayTransactionData;
  verifiedByUserId?: string;
  source: "webhook" | "manual_verify";
}) {
  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from("property_transactions")
    .select("*")
    .eq("provider_reference", input.reference)
    .maybeSingle();

  if (transactionError) {
    throw new HttpError(500, transactionError.message);
  }

  if (!transaction) {
    throw new HttpError(404, "Property transaction not found");
  }

  const typedTransaction = transaction as PropertyTransactionRow;
  const provider = input.provider || typedTransaction.provider || "paystack";
  const normalizedStatus = normalizeStatus(input.verifiedTransaction.status);
  const providerTransactionId =
    input.verifiedTransaction.id !== undefined
      ? String(input.verifiedTransaction.id)
      : typedTransaction.provider_transaction_id;
  const providerMetadata = input.verifiedTransaction.metadata || {};
  const providerColumnUpdates =
    provider === "stripe"
      ? {
          stripe_checkout_session_id:
            (providerMetadata.stripeCheckoutSessionId as string | undefined) || null,
          stripe_payment_intent_id:
            (providerMetadata.stripePaymentIntentId as string | undefined) ||
            providerTransactionId ||
            null,
        }
      : {};
  const mergedMetadata = {
    ...(typedTransaction.metadata || {}),
    paymentGateway: provider,
    [provider]: input.verifiedTransaction,
    reconciliationSource: input.source,
  };

  if (normalizedStatus !== "success") {
    const { data: updatedTransaction, error: updateError } = await admin
      .from("property_transactions")
      .update({
        status: normalizedStatus,
        payment_channel:
          input.verifiedTransaction.channel || typedTransaction.payment_channel,
        provider_transaction_id: providerTransactionId,
        gateway_response:
          input.verifiedTransaction.gateway_response || typedTransaction.gateway_response,
        ...providerColumnUpdates,
        metadata: mergedMetadata,
      })
      .eq("id", typedTransaction.id)
      .select("*")
      .single();

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return {
      transaction: updatedTransaction,
      receipt: null,
      alreadyProcessed: false,
    };
  }

  const { data: existingReceipt } = await admin
    .from("transaction_receipts")
    .select("*")
    .eq("transaction_id", typedTransaction.id)
    .maybeSingle();

  if (typedTransaction.status === "success" && existingReceipt) {
    const existingTypedReceipt = existingReceipt as TransactionReceiptRow;
    const publicReceipt = existingTypedReceipt.public_verification_token
      ? existingTypedReceipt
      : await publishPublicReceipt({
          admin,
          receipt: existingTypedReceipt,
          transaction: typedTransaction,
          receiptPayload: existingTypedReceipt.receipt_payload || {},
          receiptHash: existingTypedReceipt.receipt_sha256,
          receiptNumber: existingTypedReceipt.receipt_number,
          provider: String(provider),
        });

    return {
      transaction: typedTransaction,
      receipt: publicReceipt,
      alreadyProcessed: true,
    };
  }

  const receiptId = existingReceipt?.id || crypto.randomUUID();
  const receiptNumber =
    existingReceipt?.receipt_number || buildReceiptNumber(input.reference);
  const storagePath =
    existingReceipt?.storage_path ||
    buildReceiptPath(typedTransaction.organization_id, input.reference);
  const receiptPayload = buildReceiptPayload(
    typedTransaction,
    input.verifiedTransaction,
    receiptId,
    receiptNumber
  );
  const receiptText = buildReceiptText(receiptPayload);
  const receiptHash = await sha256Hex(receiptText);

  const { error: uploadError } = await admin.storage
    .from("receipts")
    .upload(storagePath, new Blob([receiptText], { type: "text/plain;charset=utf-8" }), {
      upsert: true,
      contentType: "text/plain;charset=utf-8",
    });

  if (uploadError) {
    throw new HttpError(500, uploadError.message);
  }

  const paidAt = input.verifiedTransaction.paid_at || new Date().toISOString();
  const { data: updatedTransaction, error: updatedTransactionError } = await admin
    .from("property_transactions")
    .update({
      status: "success",
      paid_at: paidAt,
      payment_channel:
        input.verifiedTransaction.channel || typedTransaction.payment_channel,
      provider_transaction_id: providerTransactionId,
      gateway_response:
        input.verifiedTransaction.gateway_response || typedTransaction.gateway_response,
      ...providerColumnUpdates,
      metadata: mergedMetadata,
    })
    .eq("id", typedTransaction.id)
    .select("*")
    .single();

  if (updatedTransactionError) {
    throw new HttpError(500, updatedTransactionError.message);
  }

  await syncDealCasePaymentState({
    dealCaseId: updatedTransaction.deal_case_id,
    purpose: updatedTransaction.purpose,
    paidAt,
  });

  const finalizedPayload = {
    ...receiptPayload,
    integrity: {
      algorithm: "SHA-256",
      receiptHash,
      status: "hashed",
    },
  };
  const receiptHtml = buildReceiptHtml(finalizedPayload, undefined);

  const { data: receipt, error: receiptError } = await admin
    .from("transaction_receipts")
    .upsert(
      {
        id: receiptId,
        transaction_id: typedTransaction.id,
        receipt_number: receiptNumber,
        storage_bucket: "receipts",
        storage_path: storagePath,
        receipt_sha256: receiptHash,
        receipt_payload: finalizedPayload,
        receipt_html: receiptHtml,
        receipt_pdf_status: "html_ready",
        receipt_generated_at: new Date().toISOString(),
        integrity_status: "hashed",
        verification_url: existingReceipt?.verification_url || null,
      },
      { onConflict: "transaction_id" }
    )
    .select("*")
    .single();

  if (receiptError) {
    throw new HttpError(500, receiptError.message);
  }

  await admin.from("verification_hashes").upsert(
    {
      organization_id: typedTransaction.organization_id,
      document_id: receipt.id,
      document_type: "payment_receipt",
      hash_algorithm: "SHA-256",
      hash_value: receiptHash,
      verified: true,
      verification_timestamp: new Date().toISOString(),
      uploaded_by: typedTransaction.payer_user_id,
      metadata: {
        provider,
        providerReference: typedTransaction.provider_reference,
        source: input.source,
      },
    },
    {
      onConflict: "organization_id,document_id,hash_value",
    }
  );

  await logIntegrityEvent({
    organizationId: typedTransaction.organization_id,
    actorUserId: input.verifiedByUserId || typedTransaction.payer_user_id,
    eventType: "receipt_hash_created",
    subjectType: "transaction_receipt",
    subjectId: receipt.id,
    hashValue: receiptHash,
    payload: {
      provider,
      providerReference: typedTransaction.provider_reference,
      receiptId,
      receiptNumber,
      source: input.source,
    },
  });

  const publicReceipt = await publishPublicReceipt({
    admin,
    receipt: receipt as TransactionReceiptRow,
    transaction: updatedTransaction as PropertyTransactionRow,
    receiptPayload: finalizedPayload,
    receiptHash,
    receiptNumber,
    provider: String(provider),
    receiptHtml,
  });

  return {
    transaction: updatedTransaction,
    receipt: publicReceipt,
    alreadyProcessed: false,
  };
}

export async function reconcilePaystackPayment(input: {
  reference: string;
  verifiedTransaction: PaymentGatewayTransactionData;
  verifiedByUserId?: string;
  source: "webhook" | "manual_verify";
}) {
  return reconcilePropertyPayment({
    ...input,
    provider: "paystack",
  });
}
