import { getSupabaseClient } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const token = req.headers.get("x-baytmiftah-api-key") || "";
    if (!token) return errorResponse("API key required", 401);

    const tokenHash = await sha256Hex(token);
    const { data: key, error: keyError } = await supabase
      .from("partner_api_keys")
      .select("id,organization_id,scopes,status")
      .eq("token_hash", tokenHash)
      .eq("status", "active")
      .maybeSingle();
    if (keyError) throw keyError;
    if (!key) return errorResponse("Invalid API key", 401);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "event";
    if (req.method === "POST" && action === "event") {
      const body = await req.json();
      const eventType = body.eventType || body.event_type || "partner.event";
      const { data, error } = await supabase.from("partner_api_events").insert([{
        api_key_id: key.id,
        organization_id: key.organization_id,
        event_type: eventType,
        payload: body,
      }]).select().single();
      if (error) throw error;
      await supabase.from("partner_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
      return jsonResponse({ received: true, event: data }, 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Partner API failed", 400);
  }
});
