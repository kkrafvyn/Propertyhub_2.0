import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

const SUPPORTED_PROVIDERS = new Set([
  "monzo",
  "bank-of-ghana",
  "gtbank",
  "fidelity",
  "standard-chartered",
]);

function getBankFeedProviderConfig(provider: string) {
  const normalised = provider.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  switch (normalised) {
    case "bank-of-ghana":
    case "bankofghana":
      return {
        id: "bank-of-ghana",
        label: "Bank of Ghana",
        baseUrl: Deno.env.get("BANK_OF_GHANA_FEED_BASE_URL") || null,
        apiKey: Deno.env.get("BANK_OF_GHANA_FEED_API_KEY") || null,
      };
    case "monzo":
      return {
        id: "monzo",
        label: "Monzo",
        baseUrl: Deno.env.get("MONZO_FEED_BASE_URL") || null,
        apiKey: Deno.env.get("MONZO_FEED_API_KEY") || null,
      };
    case "gtbank":
      return {
        id: "gtbank",
        label: "GTBank",
        baseUrl: Deno.env.get("GTBANK_FEED_BASE_URL") || null,
        apiKey: Deno.env.get("GTBANK_FEED_API_KEY") || null,
      };
    case "fidelity":
      return {
        id: "fidelity",
        label: "Fidelity Bank",
        baseUrl: Deno.env.get("FIDELITY_FEED_BASE_URL") || null,
        apiKey: Deno.env.get("FIDELITY_FEED_API_KEY") || null,
      };
    case "standard-chartered":
    case "standardchartered":
      return {
        id: "standard-chartered",
        label: "Standard Chartered",
        baseUrl: Deno.env.get("STANDARD_CHARTERED_FEED_BASE_URL") || null,
        apiKey: Deno.env.get("STANDARD_CHARTERED_FEED_API_KEY") || null,
      };
    default:
      return null;
  }
}

async function fetchProviderTransactions(input: {
  provider: string;
  providerAccountId: string;
  cursor?: string | null;
}) {
  const config = getBankFeedProviderConfig(input.provider);
  if (!config || !config.baseUrl || !config.apiKey) {
    const today = new Date().toISOString().slice(0, 10);
    const transactions = [
      {
        providerTransactionId: `sim_${input.provider}_rent_${today}`,
        transactionDate: today,
        description: "Tenant rent collection (simulated feed)",
        amountMinor: 650000,
        transactionType: "CREDIT" as const,
        bankReference: `SIM-RENT-${today.replace(/-/g, "")}`,
      },
      {
        providerTransactionId: `sim_${input.provider}_fee_${today}`,
        transactionDate: today,
        description: "Bank service charge (simulated feed)",
        amountMinor: 2500,
        transactionType: "DEBIT" as const,
        bankReference: `SIM-FEE-${today.replace(/-/g, "")}`,
      },
      {
        providerTransactionId: `sim_${input.provider}_momo_${today}`,
        transactionDate: today,
        description: "MoMo settlement batch (simulated feed)",
        amountMinor: 125000,
        transactionType: "CREDIT" as const,
        bankReference: `SIM-MOMO-${today.replace(/-/g, "")}`,
      },
    ];
    return {
      transactions,
      nextCursor: input.cursor ?? null,
      status: "synced",
      simulated: true,
      message: `${config?.label ?? input.provider} demo feed — ${transactions.length} transactions (configure feed env vars for live sync).`,
    };
  }

  const response = await fetch(`${config.baseUrl}/bank-feed/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-Provider-Account-Id": input.providerAccountId,
      "X-Cursor": input.cursor ?? "",
    },
    body: JSON.stringify({ providerAccountId: input.providerAccountId, cursor: input.cursor ?? null }),
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    throw new HttpError(response.status || 502, rawText || `Bank feed sync failed for ${config.label}`);
  }

  const payload = await response.json().catch(() => ({ transactions: [], nextCursor: null }));
  const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

  return {
    transactions,
    nextCursor: payload.nextCursor ?? input.cursor ?? null,
    status: "synced",
    message: `${transactions.length} transactions fetched for ${config.label}`,
  };
}

function isBankTransactionRecord(value: unknown): value is {
  providerTransactionId: string;
  transactionDate: string;
  description: string;
  amountMinor: number;
  transactionType: "DEBIT" | "CREDIT";
  bankReference?: string | null;
} {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.providerTransactionId === "string" &&
    typeof record.transactionDate === "string" &&
    typeof record.description === "string" &&
    typeof record.amountMinor === "number" &&
    (record.transactionType === "DEBIT" || record.transactionType === "CREDIT")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const body = await req.json().catch(() => ({}));
    const connectionId = typeof body?.connectionId === "string" ? body.connectionId.trim() : "";

    if (!connectionId) {
      throw new HttpError(400, "connectionId is required");
    }

    const admin = createAdminClient();
    const { data: connection, error: connectionError } = await admin
      .from("bank_feed_connections")
      .select("id, organization_id, provider, provider_account_id, status, cursor")
      .eq("id", connectionId)
      .maybeSingle();

    if (connectionError) {
      throw new HttpError(500, connectionError.message);
    }

    if (!connection) {
      throw new HttpError(404, "Bank feed connection not found");
    }

    const { data: membership } = await admin
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", connection.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const financeRoles = new Set([
      "owner",
      "manager",
      "finance_manager",
      "finance_officer",
      "head_property_management",
    ]);

    if (!membership || !financeRoles.has(String(membership.role))) {
      throw new HttpError(403, "You do not have access to this bank feed connection");
    }

    const provider = String(connection.provider || "").trim().toLowerCase();
    if (!SUPPORTED_PROVIDERS.has(provider)) {
      throw new HttpError(400, `Unsupported bank feed provider: ${provider || "unknown"}`);
    }

    const dryRun = Boolean(body?.dryRun);
    const syncResult = await fetchProviderTransactions({
      provider,
      providerAccountId: String(connection.provider_account_id || ""),
      cursor: typeof body?.cursor === "string" ? body.cursor : connection.cursor ?? null,
    });

    if (dryRun) {
      return jsonResponse(200, {
        status: "dry-run",
        provider,
        connectionId,
        imported: 0,
        skipped: 0,
        cursor: syncResult.nextCursor,
        lastSyncedAt: new Date().toISOString(),
        providerMessage: syncResult.message,
      });
    }

    const rawTransactions = Array.isArray(syncResult.transactions)
      ? syncResult.transactions.filter(isBankTransactionRecord)
      : [];

    let imported = 0;
    if (rawTransactions.length > 0) {
      const rows = rawTransactions.map((item) => ({
        connection_id: connection.id,
        provider_transaction_id: item.providerTransactionId,
        transaction_date: item.transactionDate,
        description: item.description,
        amount_minor: item.amountMinor,
        transaction_type: item.transactionType,
        bank_reference: item.bankReference ?? null,
      }));

      const { error: upsertError } = await admin
        .from("bank_feed_transactions")
        .upsert(rows, { onConflict: "connection_id,provider_transaction_id", ignoreDuplicates: false });

      if (upsertError) {
        throw new HttpError(500, upsertError.message);
      }

      imported = rows.length;
    }

    const { error: updateError } = await admin
      .from("bank_feed_connections")
      .update({
        cursor: syncResult.nextCursor ?? connection.cursor,
        last_synced_at: new Date().toISOString(),
        last_error: syncResult.status === "not-configured" ? syncResult.message : null,
        status: syncResult.status === "not-configured" ? "paused" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return jsonResponse(200, {
      status: syncResult.status === "not-configured" ? "paused" : "ok",
      provider,
      connectionId,
      imported,
      skipped: 0,
      cursor: syncResult.nextCursor,
      lastSyncedAt: new Date().toISOString(),
      providerMessage: syncResult.message,
      simulated: Boolean((syncResult as { simulated?: boolean }).simulated),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("sync-bank-feed error:", error);
    return jsonResponse(500, { error: "Unable to sync bank feed" });
  }
});
