import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";
import { sendWhatsAppTextMessage } from "../_shared/whatsapp-cloud.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    await requireAuthenticatedUser(authHeader);

    const body = await req.json().catch(() => null);
    const to = String(body?.to || "").trim();
    const message = String(body?.message || "").trim();
    const organizationId = body?.organizationId ? String(body.organizationId) : undefined;

    if (!to || !message) {
      throw new HttpError(400, "to and message are required");
    }

    if (organizationId) {
      const admin = createAdminClient();
      const { data: member } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();
      if (!member) throw new HttpError(403, "Invalid organization");
    }

    const result = await sendWhatsAppTextMessage({ to, text: message });
    return jsonResponse(200, result, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("send-whatsapp error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "WhatsApp send failed") }, req);
  }
});
