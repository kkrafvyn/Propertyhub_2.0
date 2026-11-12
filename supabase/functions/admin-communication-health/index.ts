import {
  createAdminClient,
  requireAuthenticatedUser,
} from "../_shared/supabase.ts";
import {
  getCorsHeaders,
  HttpError,
  jsonResponse,
  safeErrorMessage,
} from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: getCorsHeaders(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const { userClient } = await requireAuthenticatedUser(
      req.headers.get("Authorization"),
    );
    const { error: denied } = await userClient.rpc(
      "admin_require_communication_access",
    );
    if (denied)
      throw new HttpError(
        403,
        "Communications access and completed MFA are required",
      );
    const { organizationId } = await req.json();
    if (
      organizationId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        organizationId,
      )
    )
      throw new HttpError(400, "Invalid organization ID");
    const checks = [
      {
        name: "Webhook verification",
        ready: Boolean(Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim()),
        detail: "A verification token is required for Meta webhook setup.",
      },
      {
        name: "Webhook signature validation",
        ready: Boolean(Deno.env.get("WHATSAPP_APP_SECRET")?.trim()),
        detail:
          "The Meta app secret is required to validate incoming messages.",
      },
    ];
    if (organizationId) {
      const { data: row, error } = await createAdminClient()
        .from("organization_integrations")
        .select("status,config")
        .eq("organization_id", organizationId)
        .eq("catalog_slug", "whatsapp-business")
        .maybeSingle();
      if (error)
        throw new HttpError(
          500,
          "Organization connection could not be checked",
        );
      const config = (row?.config || {}) as Record<string, unknown>;
      const fallback =
        Deno.env.get("WHATSAPP_DEFAULT_ORG_ID")?.trim() === organizationId;
      const configured = Boolean(
        row &&
          ["connected", "available"].includes(row.status) &&
          String(config.phone_number_id || config.phoneNumberId || "").trim() &&
          String(config.access_token || config.accessToken || "").trim(),
      );
      const fallbackReady = Boolean(
        fallback &&
          Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() &&
          Deno.env.get("WHATSAPP_CLOUD_TOKEN")?.trim(),
      );
      checks.push({
        name: "Organization WhatsApp credentials",
        ready: configured || fallbackReady,
        detail:
          configured || fallbackReady
            ? "Sending credentials are present. Meta authorization and number registration still require confirmation in Meta."
            : "Connect this organization with its Meta phone-number ID and access token.",
      });
    } else
      checks.push({
        name: "Organization selected",
        ready: false,
        detail:
          "Enter an organization ID to check its WhatsApp sending connection.",
      });
    return jsonResponse(
      200,
      { checks, checkedAt: new Date().toISOString() },
      req,
      { "Cache-Control": "no-store" },
    );
  } catch (error) {
    return jsonResponse(
      error instanceof HttpError ? error.status : 500,
      { error: safeErrorMessage(error, "Unable to check communications") },
      req,
    );
  }
});
