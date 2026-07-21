import { HttpError } from "./http.ts";
import { PaystackTransactionData } from "./paystack.ts";
import { createAdminClient } from "./supabase.ts";

type PropertyTransactionRow = {
  id: string;
  listing_id: string;
  property_id: string;
  organization_id: string;
  deal_case_id: string | null;
  payer_user_id: string;
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
  blockchain_record_id: string | null;
  blockchain_status: string;
  blockchain_network: string;
  blockchain_txid: string | null;
  verification_url: string | null;
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
  return `PH-${new Date().getFullYear()}-${suffix}`;
}

function buildReceiptPath(organizationId: string, reference: string) {
  const year = new Date().getUTCFullYear();
  return `${organizationId}/${year}/${reference}.txt`;
}

function normalizeStatus(status?: string) {
  switch (status) {
    case "success":
      return "success";
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
  paystackData: PaystackTransactionData,
  receiptId: string,
  receiptNumber: string
) {
  return {
    receiptId,
    receiptNumber,
    provider: "paystack",
    providerReference: transaction.provider_reference,
    providerTransactionId:
      transaction.provider_transaction_id || String(paystackData.id || ""),
    organizationId: transaction.organization_id,
    listingId: transaction.listing_id,
    propertyId: transaction.property_id,
    dealCaseId: transaction.deal_case_id,
    payerUserId: transaction.payer_user_id,
    purpose: transaction.purpose,
    amountMinor: transaction.amount_minor,
    amountFormatted: minorToMajorString(transaction.amount_minor, transaction.currency),
    currency: transaction.currency,
    paymentChannel: paystackData.channel || transaction.payment_channel,
    gatewayResponse: paystackData.gateway_response || transaction.gateway_response,
    customerEmail: paystackData.customer?.email,
    paidAt: paystackData.paid_at || new Date().toISOString(),
    generatedAt: new Date().toISOString(),
  };
}

function buildReceiptText(payload: ReturnType<typeof buildReceiptPayload>) {
  return [
    "Property Hub Payment Receipt",
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

async function ensureUserWallet(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  currency: string
) {
  const { data: existing } = await admin
    .from("user_wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await admin
    .from("user_wallets")
    .insert({
      user_id: userId,
      currency,
      available_minor: 0,
      pending_minor: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function appendWalletLedger(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    walletId: string;
    entryType: string;
    amountMinor: number;
    availableMinor: number;
    pendingMinor: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
  }
) {
  const { data: existing } = await admin
    .from("wallet_ledger")
    .select("id")
    .eq("wallet_id", input.walletId)
    .eq("reference_type", input.referenceType || "")
    .eq("reference_id", input.referenceId || "")
    .eq("entry_type", input.entryType)
    .maybeSingle();

  if (existing?.id) return;

  await admin.from("wallet_ledger").insert({
    wallet_id: input.walletId,
    entry_type: input.entryType,
    amount_minor: input.amountMinor,
    balance_available_minor: input.availableMinor,
    balance_pending_minor: input.pendingMinor,
    reference_type: input.referenceType || null,
    reference_id: input.referenceId || null,
    description: input.description || null,
  });
}

function calculatePlatformFee(amountMinor: number) {
  return Math.max(0, Math.round(amountMinor * 0.025));
}

function calculateNetAmount(amountMinor: number) {
  return amountMinor - calculatePlatformFee(amountMinor);
}

async function creditOrganizationFromPayment(
  admin: ReturnType<typeof createAdminClient>,
  transaction: PropertyTransactionRow
) {
  const netMinor = calculateNetAmount(transaction.amount_minor);
  if (netMinor <= 0) return;

  const { data: existingLedger } = await admin
    .from("organization_wallet_ledger")
    .select("id, wallet:organization_wallets!inner(organization_id)")
    .eq("reference_type", "property_transaction")
    .eq("reference_id", transaction.id)
    .maybeSingle();

  if (existingLedger?.id) return;

  await admin.rpc("credit_organization_wallet", {
    p_organization_id: transaction.organization_id,
    p_amount_minor: netMinor,
    p_currency: transaction.currency,
    p_reference_type: "property_transaction",
    p_reference_id: transaction.id,
    p_description: `Payment received for ${transaction.purpose}`,
    p_entry_type: "payment",
  });
}

async function createPaymentNotifications(
  admin: ReturnType<typeof createAdminClient>,
  transaction: PropertyTransactionRow
) {
  const amountLabel = minorToMajorString(transaction.amount_minor, transaction.currency);
  const notifications = [
    {
      userId: transaction.payer_user_id,
      notificationType: "payment_success",
      subject: "Payment confirmed",
      content: `Your ${transaction.purpose.replace(/_/g, " ")} payment of ${amountLabel} was successful.`,
      actionUrl: "/app/wallet",
      category: "Transactions",
    },
  ];

  const { data: managers } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", transaction.organization_id)
    .in("role", ["owner", "manager"]);

  for (const manager of managers || []) {
    notifications.push({
      userId: manager.user_id,
      notificationType: "payment_received",
      subject: "Payment received",
      content: `A ${transaction.purpose.replace(/_/g, " ")} payment of ${amountLabel} was received.`,
      actionUrl: "/workspace?next=finance",
      category: "Transactions",
    });
  }

  for (const notification of notifications) {
    await admin.from("notification_logs").insert({
      user_id: notification.userId,
      notification_type: notification.notificationType,
      notification_category: notification.category,
      channel: "in_app",
      subject: notification.subject,
      content: notification.content,
      action_url: notification.actionUrl,
      metadata: { transactionId: transaction.id, purpose: transaction.purpose },
      delivered: true,
      delivered_at: new Date().toISOString(),
      read: false,
    });
  }
}

async function syncFinancialSideEffects(transaction: PropertyTransactionRow) {
  const admin = createAdminClient();
  const wallet = await ensureUserWallet(admin, transaction.payer_user_id, transaction.currency);
  const metadata = transaction.metadata || {};
  const bookingId =
    typeof metadata.bookingId === "string" ? metadata.bookingId : null;

  await appendWalletLedger(admin, {
    walletId: wallet.id,
    entryType: "payment",
    amountMinor: transaction.amount_minor,
    availableMinor: wallet.available_minor || 0,
    pendingMinor: wallet.pending_minor || 0,
    referenceType: "property_transaction",
    referenceId: transaction.id,
    description: `Paystack ${transaction.purpose} payment`,
  });

  if (["deposit", "purchase_installment"].includes(transaction.purpose)) {
    const nextPending = (wallet.pending_minor || 0) + transaction.amount_minor;
    await admin
      .from("user_wallets")
      .update({ pending_minor: nextPending, updated_at: new Date().toISOString() })
      .eq("id", wallet.id);

    await admin.from("escrow_holds").upsert(
      {
        transaction_id: transaction.id,
        deal_case_id: transaction.deal_case_id,
        payer_user_id: transaction.payer_user_id,
        organization_id: transaction.organization_id,
        amount_minor: transaction.amount_minor,
        currency: transaction.currency,
        status: "held",
      },
      { onConflict: "transaction_id" }
    );

    await appendWalletLedger(admin, {
      walletId: wallet.id,
      entryType: "hold",
      amountMinor: transaction.amount_minor,
      availableMinor: wallet.available_minor || 0,
      pendingMinor: nextPending,
      referenceType: "escrow_hold",
      referenceId: transaction.id,
      description: "Funds held in escrow",
    });
  }

  if (bookingId) {
    const { data: booking } = await admin
      .from("short_stay_bookings")
      .select("listing_id, check_in, check_out")
      .eq("id", bookingId)
      .maybeSingle();

    await admin
      .from("short_stay_bookings")
      .update({
        status: "confirmed",
        transaction_id: transaction.id,
      })
      .eq("id", bookingId);

    if (booking) {
      const start = new Date(`${booking.check_in}T00:00:00`);
      const end = new Date(`${booking.check_out}T00:00:00`);
      const rows = [];

      for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
        rows.push({
          listing_id: booking.listing_id,
          available_date: cursor.toISOString().slice(0, 10),
          is_available: false,
        });
      }

      if (rows.length > 0) {
        await admin
          .from("listing_availability")
          .upsert(rows, { onConflict: "listing_id,available_date" });
      }
    }
  }

  if (
    ["rent", "lease_fee", "booking_fee", "inspection_fee"].includes(transaction.purpose)
  ) {
    await creditOrganizationFromPayment(admin, transaction);
  }

  if (["rent", "lease_fee"].includes(transaction.purpose)) {
    const { data: existingLease } = await admin
      .from("leases")
      .select("id")
      .eq("tenant_user_id", transaction.payer_user_id)
      .eq("listing_id", transaction.listing_id)
      .eq("status", "active")
      .maybeSingle();

    if (!existingLease) {
      const startDate = new Date().toISOString().slice(0, 10);
      const nextRentDue = new Date(startDate);
      nextRentDue.setMonth(nextRentDue.getMonth() + 1);

      await admin.from("leases").insert({
        deal_case_id: transaction.deal_case_id,
        tenant_user_id: transaction.payer_user_id,
        listing_id: transaction.listing_id,
        organization_id: transaction.organization_id,
        start_date: startDate,
        rent_minor: transaction.amount_minor,
        currency: transaction.currency,
        status: "active",
        next_rent_due_at: nextRentDue.toISOString().slice(0, 10),
      });
    } else if (transaction.purpose === "rent") {
      const nextRentDue = new Date();
      nextRentDue.setMonth(nextRentDue.getMonth() + 1);
      await admin
        .from("leases")
        .update({ next_rent_due_at: nextRentDue.toISOString().slice(0, 10) })
        .eq("id", existingLease.id);

      const dueDate = new Date().toISOString().slice(0, 10);
      await admin
        .from("lease_rent_schedule")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          transaction_id: transaction.id,
        })
        .eq("lease_id", existingLease.id)
        .eq("status", "upcoming")
        .lte("due_date", dueDate);

      const { data: nextScheduleRow } = await admin
        .from("lease_rent_schedule")
        .select("due_date")
        .eq("lease_id", existingLease.id)
        .eq("status", "upcoming")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextScheduleRow?.due_date) {
        await admin
          .from("leases")
          .update({ next_rent_due_at: nextScheduleRow.due_date })
          .eq("id", existingLease.id);
      }
    }
  }

  await createPaymentNotifications(admin, transaction);
}

export async function reconcilePaystackPayment(input: {
  reference: string;
  verifiedTransaction: PaystackTransactionData;
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

  const normalizedStatus = normalizeStatus(input.verifiedTransaction.status);
  const providerTransactionId =
    input.verifiedTransaction.id !== undefined
      ? String(input.verifiedTransaction.id)
      : transaction.provider_transaction_id;
  const mergedMetadata = {
    ...(transaction.metadata || {}),
    paystack: input.verifiedTransaction,
    reconciliationSource: input.source,
  };

  if (normalizedStatus !== "success") {
    const { data: updatedTransaction, error: updateError } = await admin
      .from("property_transactions")
      .update({
        status: normalizedStatus,
        payment_channel: input.verifiedTransaction.channel || transaction.payment_channel,
        provider_transaction_id: providerTransactionId,
        gateway_response:
          input.verifiedTransaction.gateway_response || transaction.gateway_response,
        metadata: mergedMetadata,
      })
      .eq("id", transaction.id)
      .select("*")
      .single();

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return {
      transaction: updatedTransaction,
      receipt: null,
      blockchainRecord: null,
      alreadyProcessed: false,
    };
  }

  const { data: existingReceipt } = await admin
    .from("transaction_receipts")
    .select("*")
    .eq("transaction_id", transaction.id)
    .maybeSingle();

  if (transaction.status === "success" && existingReceipt) {
    return {
      transaction,
      receipt: existingReceipt,
      blockchainRecord: null,
      alreadyProcessed: true,
    };
  }

  const receiptId = existingReceipt?.id || crypto.randomUUID();
  const receiptNumber = existingReceipt?.receipt_number || buildReceiptNumber(input.reference);
  const storagePath =
    existingReceipt?.storage_path ||
    buildReceiptPath(transaction.organization_id, input.reference);
  const receiptPayload = buildReceiptPayload(
    transaction,
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
      payment_channel: input.verifiedTransaction.channel || transaction.payment_channel,
      provider_transaction_id: providerTransactionId,
      gateway_response:
        input.verifiedTransaction.gateway_response || transaction.gateway_response,
      metadata: mergedMetadata,
    })
    .eq("id", transaction.id)
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

  const { data: finalizedReceipt, error: receiptError } = await admin
    .from("transaction_receipts")
    .upsert(
      {
        id: receiptId,
        transaction_id: transaction.id,
        receipt_number: receiptNumber,
        storage_bucket: "receipts",
        storage_path: storagePath,
        receipt_sha256: receiptHash,
        receipt_payload: receiptPayload,
        blockchain_status: "disabled",
        blockchain_network: "none",
        blockchain_txid: null,
        blockchain_record_id: null,
        verification_url: null,
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
      organization_id: transaction.organization_id,
      document_id: finalizedReceipt.id,
      document_type: "payment_receipt",
      hash_algorithm: "SHA-256",
      hash_value: receiptHash,
      blockchain_record_id: null,
      verified: true,
      verification_timestamp: new Date().toISOString(),
      uploaded_by: transaction.payer_user_id,
    },
    {
      onConflict: "organization_id,document_id,hash_value",
    }
  );

  await syncFinancialSideEffects(updatedTransaction);

  return {
    transaction: updatedTransaction,
    receipt: finalizedReceipt,
    blockchainRecord: null,
    alreadyProcessed: false,
  };
}
