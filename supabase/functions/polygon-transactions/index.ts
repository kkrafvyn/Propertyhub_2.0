import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

type PolygonScanTransaction = {
  hash?: string;
  blockNumber?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  value?: string;
  gasUsed?: string;
  gasPrice?: string;
  isError?: string;
  confirmations?: string;
  contractAddress?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);

  try {
    const { user, userClient } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    await enforceRateLimit({ bucket: rateLimitKey("polygon-transactions", user.id), maxHits: 20, windowSeconds: 60 });

    const body = await req.json().catch(() => null);
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : "";
    const network = body?.network === "mainnet" ? "mainnet" : "amoy";
    const addresses = Array.isArray(body?.addresses)
      ? [...new Set(body.addresses.filter((value: unknown): value is string => typeof value === "string" && ADDRESS_RE.test(value)))].slice(0, 5)
      : [];
    if (!organizationId || !addresses.length) throw new HttpError(400, "Organization and contract addresses are required");

    const { data: membership, error: membershipError } = await userClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError || !membership) throw new HttpError(403, "Organization access is required");

    const apiKey = Deno.env.get("POLYGONSCAN_API_KEY")?.trim();
    if (!apiKey) throw new HttpError(503, "PolygonScan API is not configured");
    const endpoint = network === "mainnet" ? "https://api.polygonscan.com/api" : "https://api-amoy.polygonscan.com/api";

    const responses = await Promise.all(addresses.map(async (address) => {
      const query = new URLSearchParams({
        module: "account",
        action: "txlist",
        address,
        startblock: "0",
        endblock: "latest",
        page: "1",
        offset: "50",
        sort: "desc",
        apikey: apiKey,
      });
      const response = await fetch(`${endpoint}?${query.toString()}`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new HttpError(502, "PolygonScan is unavailable");
      const payload = await response.json();
      if (payload?.status === "0" && String(payload?.message || "").toLowerCase().includes("no transactions")) return [];
      if (payload?.status !== "1" || !Array.isArray(payload?.result)) throw new HttpError(502, "PolygonScan returned an invalid response");
      return payload.result as PolygonScanTransaction[];
    }));

    const transactions = [...new Map(responses.flat().map((transaction) => [transaction.hash, transaction])).values()]
      .filter((transaction) => typeof transaction.hash === "string")
      .sort((a, b) => Number(b.timeStamp || 0) - Number(a.timeStamp || 0))
      .slice(0, 100)
      .map((transaction) => ({
        hash: transaction.hash,
        blockNumber: Number(transaction.blockNumber || 0),
        timestamp: Number(transaction.timeStamp || 0) * 1000,
        from: transaction.from || "",
        to: transaction.to || transaction.contractAddress || "",
        valueWei: transaction.value || "0",
        gasUsed: transaction.gasUsed || "0",
        gasPriceWei: transaction.gasPrice || "0",
        status: transaction.isError === "1" ? "failed" : "confirmed",
        confirmations: Number(transaction.confirmations || 0),
      }));

    return jsonResponse(200, { network, transactions }, req);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("polygon-transactions error:", error);
    return jsonResponse(500, { error: "Unable to load Polygon transactions" }, req);
  }
});
