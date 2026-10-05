import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { requireEstateMessagingMembership } from "../_shared/org-auth.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";
import { resolveWhatsAppCredentialsForOrg, sendWhatsAppTextMessage } from "../_shared/whatsapp-cloud.ts";
import {
  isPlatformFeatureEnabled,
  PLATFORM_FEATURE_KEYS,
} from "../_shared/platform-feature-flags.ts";

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
      bucket: rateLimitKey("whatsapp-send", user.id),
      maxHits: 20,
      windowSeconds: 60,
    });

    const body = await req.json().catch(() => null);
    const to = String(body?.to || "").trim();
    const message = String(body?.message || "").trim();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : "";

    if (!to || !message || !organizationId) {
      throw new HttpError(400, "organizationId, to and message are required");
    }
    if (message.length > 4000) throw new HttpError(400, "Message is too long");

    await requireEstateMessagingMembership(createAdminClient(), user.id, organizationId);
    await enforceRateLimit({
      bucket: rateLimitKey("whatsapp-send-org", organizationId),
      maxHits: 100,
      windowSeconds: 60,
    });
    if (to.length > 80) throw new HttpError(400, "Recipient is invalid");

    const admin = createAdminClient();
    if (!(await isPlatformFeatureEnabled(admin, PLATFORM_FEATURE_KEYS.whatsapp))) {
      throw new HttpError(503, "WhatsApp is disabled platform-wide.");
    }
    const credentials = await resolveWhatsAppCredentialsForOrg(admin, organizationId);
    if (!credentials?.phoneNumberId || !credentials.accessToken) {
      throw new HttpError(
        503,
        "WhatsApp is not configured for this organization. Connect WhatsApp Business credentials in integrations."
      );
    }
    const result = await sendWhatsAppTextMessage({
      to,
      text: message,
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
    });
    return jsonResponse(200, result, req);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("send-whatsapp error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "WhatsApp send failed") }, req);
  }
});
