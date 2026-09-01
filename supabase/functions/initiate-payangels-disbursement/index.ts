import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

function getDisbursementUrl() {
  const url = Deno.env.get("PAYANGELS_DISBURSEMENT_URL")?.trim();
  if (!url) throw new HttpError(503, "PayAngels disbursement is not configured");
  return url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);

  try {
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    await enforceRateLimit({ bucket: rateLimitKey("payangels-disbursement", user.id), maxHits: 10, windowSeconds: 60 });
    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Valid amount is required");
    if (!phone) throw new HttpError(400, "Recipient phone is required");
    const secret = Deno.env.get("PAYANGELS_SECRET_KEY")?.trim();
    if (!secret) throw new HttpError(503, "PayAngels is not configured");

    const response = await fetch(getDisbursementUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount.toFixed(2), currency: "GHS", recipient: phone, note: body?.note || "BaytMiftah disbursement", metadata: body?.metadata || {} }),
    });
    const payload = await response.json().catch(() => null) as { referenceId?: string; reference?: string; status?: string; message?: string } | null;
    if (!response.ok) throw new HttpError(response.status || 502, payload?.message || "PayAngels disbursement failed");
    return jsonResponse(200, { success: true, type: "disbursement", referenceId: payload?.referenceId || payload?.reference || crypto.randomUUID(), externalId: `payangels_disb_${Date.now()}`, amount: amount.toFixed(2), recipient: phone, status: payload?.status || "PENDING", message: payload?.message }, req);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("initiate-payangels-disbursement error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "Unable to initiate PayAngels disbursement") }, req);
  }
});