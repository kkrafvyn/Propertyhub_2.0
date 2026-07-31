import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    await enforceRateLimit({
      bucket: rateLimitKey("exchange-rates", user.id),
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
      return jsonResponse(200, { from, to, rate: 1 }, req);
    }

    const rate = await fetchRate(from, to);
    return jsonResponse(200, { from, to, rate, timestamp: Date.now() }, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("exchange-rates error:", error);
    return jsonResponse(500, { error: "Unable to fetch exchange rate" }, req);
  }
});
