import { Contract, JsonRpcProvider, Wallet } from "npm:ethers@6.10.0";
import { HttpError } from "./http.ts";
import { PaystackTransactionData } from "./paystack.ts";
import { createAdminClient } from "./supabase.ts";

const VERIFICATION_REGISTRY_ABI = [
  "function recordVerification(bytes32 receiptHash, string paymentReference, string propertyId, string receiptId) external returns (bytes32)",
];

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

async function recordReceiptOnChain(input: {
  receiptHash: string;
  reference: string;
  propertyId: string;
  receiptId: string;
}) {
  const registryAddress =
    Deno.env.get("VERIFICATION_REGISTRY_ADDRESS") ||
    Deno.env.get("VITE_VERIFICATION_REGISTRY_ADDRESS");
  const privateKey = Deno.env.get("BLOCKCHAIN_SIGNER_PRIVATE_KEY");
  const rpcUrl =
    Deno.env.get("POLYGON_MAINNET_RPC_URL") ||
    Deno.env.get("POLYGON_AMOY_RPC_URL") ||
    Deno.env.get("POLYGON_RPC_URL");

  if (!registryAddress || !privateKey || !rpcUrl) {
    return null;
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const registry = new Contract(registryAddress, VERIFICATION_REGISTRY_ABI, wallet);
  const transaction = await registry.recordVerification(
    `0x${input.receiptHash}`,
    input.reference,
    input.propertyId,
    input.receiptId
  );
  const receipt = await transaction.wait();

  return {
    txHash: transaction.hash,
    blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
    contractAddress: registryAddress,
    chainId: Number(Deno.env.get("PAYMENT_BLOCKCHAIN_CHAIN_ID") || "137"),
    explorerBaseUrl:
      Deno.env.get("PAYMENT_BLOCKCHAIN_EXPLORER_URL") || "https://polygonscan.com",
  };
}

async function logVerification(
  organizationId: string,
  blockchainRecordId: string | null,
  status: "pending" | "verified" | "failed",
  details: Record<string, unknown>,
  verifiedBy?: string,
  errorMessage?: string
) {
  const admin = createAdminClient();
  await admin.from("blockchain_verification_logs").insert({
    organization_id: organizationId,
    blockchain_record_id: blockchainRecordId,
    verification_type: "transaction",
    status,
    verification_details: details,
    verified_by: verifiedBy,
    verified_at: status === "verified" ? new Date().toISOString() : null,
    error_message: errorMessage || null,
  });
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
    const blockchainRecord = existingReceipt.blockchain_record_id
      ? await admin
          .from("blockchain_records")
          .select("*")
          .eq("id", existingReceipt.blockchain_record_id)
          .maybeSingle()
      : { data: null };

    return {
      transaction,
      receipt: existingReceipt,
      blockchainRecord: blockchainRecord.data,
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

  const { data: receipt, error: receiptError } = await admin
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
        blockchain_status: existingReceipt?.blockchain_status || "pending",
        blockchain_network: existingReceipt?.blockchain_network || "polygon",
        blockchain_txid: existingReceipt?.blockchain_txid || null,
        verification_url: existingReceipt?.verification_url || null,
      },
      { onConflict: "transaction_id" }
    )
    .select("*")
    .single();

  if (receiptError) {
    throw new HttpError(500, receiptError.message);
  }

  let blockchainRecord: Record<string, unknown> | null = null;
  let blockchainStatus: "pending" | "submitted" | "confirmed" | "failed" = "pending";
  let blockchainTxid: string | null = existingReceipt?.blockchain_txid || null;
  let verificationUrl: string | null = existingReceipt?.verification_url || null;

  try {
    const chainResult = await recordReceiptOnChain({
      receiptHash,
      reference: transaction.provider_reference,
      propertyId: transaction.property_id,
      receiptId,
    });

    if (chainResult) {
      const { data: createdRecord, error: blockchainError } = await admin
        .from("blockchain_records")
        .insert({
          organization_id: transaction.organization_id,
          property_id: transaction.property_id,
          transaction_hash: chainResult.txHash,
          chain_id: chainResult.chainId,
          block_number: chainResult.blockNumber,
          timestamp: Math.floor(Date.now() / 1000),
          record_type: "payment_receipt",
          data_hash: receiptHash,
          contract_address: chainResult.contractAddress,
          status: "confirmed",
          metadata: {
            receiptId,
            receiptNumber,
            provider: "paystack",
            providerReference: transaction.provider_reference,
            providerTransactionId,
            purpose: transaction.purpose,
            amountMinor: transaction.amount_minor,
            currency: transaction.currency,
          },
          created_by: transaction.payer_user_id,
        })
        .select("*")
        .single();

      if (blockchainError) {
        throw blockchainError;
      }

      blockchainRecord = createdRecord;
      blockchainStatus = "confirmed";
      blockchainTxid = chainResult.txHash;
      verificationUrl = `${chainResult.explorerBaseUrl}/tx/${chainResult.txHash}`;
    }
  } catch (error) {
    blockchainStatus = "failed";
    await logVerification(
      transaction.organization_id,
      null,
      "failed",
      {
        providerReference: transaction.provider_reference,
        receiptId,
        receiptHash,
      },
      input.verifiedByUserId,
      error instanceof Error ? error.message : "Unknown blockchain recording error"
    );
  }

  const { data: finalizedReceipt, error: finalizedReceiptError } = await admin
    .from("transaction_receipts")
    .update({
      blockchain_record_id:
        blockchainRecord && typeof blockchainRecord.id === "string"
          ? blockchainRecord.id
          : receipt.blockchain_record_id,
      blockchain_status: blockchainStatus,
      blockchain_network:
        blockchainStatus === "confirmed"
          ? `polygon:${Deno.env.get("PAYMENT_BLOCKCHAIN_CHAIN_ID") || "137"}`
          : receipt.blockchain_network,
      blockchain_txid: blockchainTxid,
      verification_url: verificationUrl,
    })
    .eq("id", receipt.id)
    .select("*")
    .single();

  if (finalizedReceiptError) {
    throw new HttpError(500, finalizedReceiptError.message);
  }

  await admin.from("verification_hashes").upsert(
    {
      organization_id: transaction.organization_id,
      document_id: finalizedReceipt.id,
      document_type: "payment_receipt",
      hash_algorithm: "SHA-256",
      hash_value: receiptHash,
      blockchain_record_id:
        blockchainRecord && typeof blockchainRecord.id === "string"
          ? blockchainRecord.id
          : null,
      verified: blockchainStatus === "confirmed",
      verification_timestamp: blockchainStatus === "confirmed" ? new Date().toISOString() : null,
      uploaded_by: transaction.payer_user_id,
    },
    {
      onConflict: "organization_id,document_id,hash_value",
    }
  );

  await logVerification(
    transaction.organization_id,
    blockchainRecord && typeof blockchainRecord.id === "string"
      ? blockchainRecord.id
      : null,
    blockchainStatus === "confirmed" ? "verified" : "pending",
    {
      providerReference: transaction.provider_reference,
      receiptId,
      receiptHash,
      source: input.source,
    },
    input.verifiedByUserId
  );

  return {
    transaction: updatedTransaction,
    receipt: finalizedReceipt,
    blockchainRecord,
    alreadyProcessed: false,
  };
}
