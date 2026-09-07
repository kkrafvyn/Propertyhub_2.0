import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchRate(from: string, to: string) {
  const apiKey = Deno.env.get("EXCHANGE_RATE_API_KEY");

  if (apiKey) {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`,
    );
    if (!response.ok) {
      throw new HttpError(502, "Exchange rate provider unavailable");
    }
    const payload = await response.json();
    const rate = Number(payload?.conversion_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new HttpError(502, "Invalid exchange rate response");
    }
    return rate;
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
  if (!response.ok) {
    throw new HttpError(502, "Public exchange rate provider unavailable");
  }
  const payload = await response.json();
  const rate = Number(payload?.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new HttpError(404, "Exchange rate not found");
  }
  return rate;
}

async function readCachedRate(from: string, to: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("currency_rates")
    .select("rate, timestamp")
    .eq("from", from)
    .eq("to", to)
    .limit(1);

  if (error) {
    console.warn("currency_rates cache read failed:", error.message);
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  const timestamp = Number(row.timestamp || 0);
  const rate = Number(row.rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (Date.now() - timestamp >= CACHE_TTL_MS) return null;

  return { rate, timestamp };
}

async function writeCachedRate(from: string, to: string, rate: number) {
  const admin = createAdminClient();
  const timestamp = Date.now();
  const { error } = await admin.from("currency_rates").upsert(
    { from, to, rate, timestamp },
    { onConflict: "from,to" },
  );

  if (error) {
    console.warn("currency_rates cache write failed:", error.message);
  }

  return timestamp;
}

async function resolveRateLimitBucket(req: Request, authHeader: string | null) {
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { user } = await requireAuthenticatedUser(authHeader);
      return rateLimitKey("exchange-rates", user.id);
    } catch {
      // Fall through to IP-based limiting for anon sessions using the publishable key.
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return rateLimitKey("exchange-rates", `ip:${ip}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const bucket = await resolveRateLimitBucket(req, authHeader);
    await enforceRateLimit({
      bucket,
      maxHits: 60,
      windowSeconds: 60,
    });

    const body = await req.json().catch(() => null);
    const from = typeof body?.from === "string" ? body.from.trim().toUpperCase() : "";
    const to = typeof body?.to === "string" ? body.to.trim().toUpperCase() : "";

    if (!from || !to || from.length !== 3 || to.length !== 3) {
      throw new HttpError(400, "from and to currency codes are required");
    }

    if (from === to) {
      return jsonResponse(200, { from, to, rate: 1, timestamp: Date.now(), cached: true }, req);
    }

    const cached = await readCachedRate(from, to);
    if (cached) {
      return jsonResponse(
        200,
        { from, to, rate: cached.rate, timestamp: cached.timestamp, cached: true },
        req,
      );
    }

    const rate = await fetchRate(from, to);
    const timestamp = await writeCachedRate(from, to, rate);

    return jsonResponse(200, { from, to, rate, timestamp, cached: false }, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("exchange-rates error:", error);
    return jsonResponse(500, { error: "Unable to fetch exchange rate" }, req);
  }
});
