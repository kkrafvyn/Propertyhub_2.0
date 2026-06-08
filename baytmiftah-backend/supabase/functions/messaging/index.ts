import { getOrganizationAccess, getSupabaseClient, isAdmin, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, requireObject } from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

async function requireOrg(supabase: ReturnType<typeof getSupabaseClient>, user: Awaited<ReturnType<typeof verifyToken>>, organizationId?: string) {
  if (!organizationId) return;
  const access = await getOrganizationAccess(supabase, user, organizationId);
  if (!access.allowed && !isAdmin(user)) throw new Error("Organization access required");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "logs";

    if (req.method === "GET" && action === "logs") {
      const { data, error } = await supabase
        .from("delivery_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "template") {
      const body = requireObject(await req.json());
      const organizationId = asString(body.organizationId || body.organization_id);
      await requireOrg(supabase, user, organizationId);
      const payload = {
        organization_id: organizationId || null,
        channel: asString(body.channel) || "email",
        name: asString(body.name) || "Untitled template",
        subject: asString(body.subject) || null,
        body: asString(body.body) || "",
        status: asString(body.status) || "draft",
        metadata: body.metadata || {},
        created_by: user.id,
      };
      const { data, error } = await supabase.from("message_templates").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "push-subscribe") {
      const body = requireObject(await req.json());
      const payload = {
        user_id: user.id,
        endpoint: asString(body.endpoint),
        keys: body.keys || {},
        user_agent: req.headers.get("User-Agent"),
      };
      if (!payload.endpoint) return errorResponse("endpoint is required", 400);
      const { data, error } = await supabase
        .from("push_subscriptions")
        .upsert(payload, { onConflict: "user_id,endpoint" })
        .select()
        .single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || payload, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "dispatch") {
      const body = requireObject(await req.json());
      const channel = asString(body.channel) || "email";
      const recipient = asString(body.recipient);
      if (["sms", "whatsapp"].includes(channel) && !isAdmin(user)) {
        return errorResponse("SMS and WhatsApp dispatch require admin access", 403);
      }
      const payload = {
        user_id: user.id,
        organization_id: asString(body.organizationId || body.organization_id) || null,
        channel,
        recipient,
        status: "queued",
        title: asString(body.title) || "BaytMiftah update",
        body: asString(body.body) || "",
        metadata: body.metadata || body,
      };
      const { data, error } = await supabase.from("delivery_logs").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse({
        delivery: data || { id: null, ...payload },
        provider: "queued",
        note: "Provider delivery is ready for Resend, Twilio, WhatsApp Business, or Web Push secrets.",
      }, error ? 200 : 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Messaging failed", 400);
  }
});
