import { getSupabaseClient, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUuid } from "../_shared/security.ts";

function fallbackForMissingTable(error: any, fallback: any) {
  if (error?.code === "PGRST205" || error?.code === "42P01") return fallback;
  throw error;
}

async function getPropertyOrganizationId(
  supabase: ReturnType<typeof getSupabaseClient>,
  propertyId?: string | null,
) {
  if (!propertyId) return null;
  const { data, error } = await supabase
    .from("properties")
    .select("organization_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  return data?.organization_id || null;
}

async function requirePropertyAccess(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: Awaited<ReturnType<typeof verifyToken>>,
  propertyId?: string | null,
) {
  const organizationId = await getPropertyOrganizationId(supabase, propertyId);
  await requireOrganizationAccess(supabase, user, organizationId);
}

async function requireDeviceAccess(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: Awaited<ReturnType<typeof verifyToken>>,
  deviceId?: string | null,
) {
  const { data: device, error } = await supabase
    .from("smart_devices")
    .select("id,property_id,owner_id")
    .eq("id", deviceId)
    .maybeSingle();

  if (error) return fallbackForMissingTable(error, null);
  if (!device) throw new Error("Device not found");
  if (device.owner_id === user.id) return device;

  await requirePropertyAccess(supabase, user, device.property_id);
  return device;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const propertyId = url.searchParams.get("propertyId");
    const deviceId = url.searchParams.get("deviceId");

    if (req.method === "GET" && action === "list") {
      if (propertyId) await requirePropertyAccess(supabase, user, propertyId);
      let query = supabase.from("smart_devices").select("*").order("created_at", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);
      if (!propertyId) query = query.eq("owner_id", user.id);
      const { data, error } = await query;
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "get") {
      await requireDeviceAccess(supabase, user, deviceId);
      const { data, error } = await supabase.from("smart_devices").select("*").eq("id", deviceId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      await requirePropertyAccess(supabase, user, body.property_id || propertyId);
      const { data, error } = await supabase.from("smart_devices").insert([{
        ...body,
        owner_id: user.id,
        status: body.status || "online",
        paired_at: body.paired_at || new Date().toISOString(),
      }]).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update") {
      await requireDeviceAccess(supabase, user, deviceId);
      const body = await req.json();
      const { data, error } = await supabase.from("smart_devices").update(body).eq("id", deviceId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete") {
      await requireDeviceAccess(supabase, user, deviceId);
      const { error } = await supabase.from("smart_devices").delete().eq("id", deviceId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "POST" && action === "command") {
      await requireDeviceAccess(supabase, user, deviceId);
      const body = await req.json();
      const command = { action: body.action, parameters: body.parameters || {} };

      const { data: device, error: deviceError } = await supabase
        .from("smart_devices")
        .update({ last_command_at: new Date().toISOString() })
        .eq("id", deviceId)
        .select()
        .maybeSingle();
      if (deviceError) return jsonResponse(fallbackForMissingTable(deviceError, null));

      await supabase.from("smart_device_logs").insert([{
        device_id: deviceId,
        property_id: device?.property_id || null,
        event_type: "command",
        event_data: command,
      }]);

      return jsonResponse({ ok: true, command, device });
    }

    if (req.method === "GET" && action === "rules") {
      await requirePropertyAccess(supabase, user, propertyId);
      const { data, error } = await supabase
        .from("smart_automation_rules")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "create-rule") {
      const body = await req.json();
      await requirePropertyAccess(supabase, user, body.property_id || propertyId);
      const { data, error } = await supabase.from("smart_automation_rules").insert([{
        ...body,
        owner_id: user.id,
        enabled: body.enabled ?? true,
      }]).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "PUT" && action === "update-rule") {
      const ruleId = url.searchParams.get("ruleId");
      const body = await req.json();
      const { data: rule } = await supabase.from("smart_automation_rules").select("property_id").eq("id", ruleId).maybeSingle();
      await requirePropertyAccess(supabase, user, rule?.property_id);
      const { data, error } = await supabase.from("smart_automation_rules").update(body).eq("id", ruleId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete-rule") {
      const ruleId = url.searchParams.get("ruleId");
      const { data: rule } = await supabase.from("smart_automation_rules").select("property_id").eq("id", ruleId).maybeSingle();
      await requirePropertyAccess(supabase, user, rule?.property_id);
      const { error } = await supabase.from("smart_automation_rules").delete().eq("id", ruleId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "alerts") {
      await requirePropertyAccess(supabase, user, propertyId);
      let query = supabase
        .from("smart_alerts")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(Number(url.searchParams.get("limit") || 100));
      const alertType = url.searchParams.get("alertType");
      if (alertType) query = query.eq("alert_type", alertType).eq("dismissed", false);
      const { data, error } = await query;
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "alert") {
      const alertId = url.searchParams.get("alertId");
      const { data: alert } = await supabase.from("smart_alerts").select("property_id").eq("id", alertId).maybeSingle();
      await requirePropertyAccess(supabase, user, alert?.property_id);
      const { data, error } = await supabase.from("smart_alerts").select("*").eq("id", alertId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "dismiss-alert") {
      const alertId = url.searchParams.get("alertId");
      const { data: alert } = await supabase.from("smart_alerts").select("property_id").eq("id", alertId).maybeSingle();
      await requirePropertyAccess(supabase, user, alert?.property_id);
      const { data, error } = await supabase.from("smart_alerts").update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
      }).eq("id", alertId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "alert-preferences") {
      const userId = url.searchParams.get("userId") || user.id;
      if (userId !== user.id) return errorResponse("Forbidden", 403);
      const { data, error } = await supabase.from("alert_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "PUT" && action === "alert-preferences") {
      const userId = url.searchParams.get("userId") || user.id;
      if (userId !== user.id) return errorResponse("Forbidden", 403);
      const body = await req.json();
      const { data, error } = await supabase.from("alert_preferences").upsert({ user_id: userId, ...body }).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "logs") {
      await requireDeviceAccess(supabase, user, deviceId);
      let query = supabase
        .from("smart_device_logs")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(Number(url.searchParams.get("limit") || 100));
      const eventType = url.searchParams.get("eventType");
      if (eventType) query = query.eq("event_type", eventType);
      const { data, error } = await query;
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "property-logs") {
      await requirePropertyAccess(supabase, user, propertyId);
      const { data, error } = await supabase
        .from("smart_device_logs")
        .select("*, device:device_id(*)")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(Number(url.searchParams.get("limit") || 50));
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "log-event") {
      await requireDeviceAccess(supabase, user, deviceId);
      const body = await req.json();
      const { data, error } = await supabase.from("smart_device_logs").insert([{
        device_id: deviceId,
        event_type: body.eventType,
        event_data: body.eventData,
      }]).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "GET" && action === "status") {
      await requireDeviceAccess(supabase, user, deviceId);
      const { data, error } = await supabase
        .from("smart_devices")
        .select("status,battery_level,signal_strength,last_seen")
        .eq("id", deviceId)
        .maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "PUT" && action === "status") {
      await requireDeviceAccess(supabase, user, deviceId);
      const body = await req.json();
      const { data, error } = await supabase.from("smart_devices").update({
        status: body.status,
        last_seen: new Date().toISOString(),
      }).eq("id", deviceId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "POST" && action === "generate-pairing-code") {
      return jsonResponse(`${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    }

    if (req.method === "POST" && action === "validate-pairing-code") {
      const body = await req.json();
      return jsonResponse(Boolean(body.pairingCode));
    }

    if (req.method === "POST" && action === "share") {
      await requireDeviceAccess(supabase, user, deviceId);
      const body = await req.json();
      const { data, error } = await supabase.from("device_sharing").insert([{
        device_id: deviceId,
        shared_with: requireUuid(body.userId || body.user_id, "userId"),
        permissions: body.permissions || "view",
      }]).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "GET" && action === "shared") {
      const userId = url.searchParams.get("userId") || user.id;
      if (userId !== user.id) return errorResponse("Forbidden", 403);
      const { data, error } = await supabase.from("device_sharing").select("*, device:device_id(*)").eq("shared_with", userId);
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "DELETE" && action === "share") {
      const shareId = url.searchParams.get("shareId");
      const { data: share } = await supabase.from("device_sharing").select("device_id").eq("id", shareId).maybeSingle();
      await requireDeviceAccess(supabase, user, share?.device_id);
      const { error } = await supabase.from("device_sharing").delete().eq("id", shareId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    const message = error.message || "Internal server error";
    const status = message.includes("Authentication") || message.includes("Authorization")
      ? 401
      : message.includes("access required") || message.includes("Forbidden")
      ? 403
      : 500;
    return errorResponse(message, status);
  }
});
