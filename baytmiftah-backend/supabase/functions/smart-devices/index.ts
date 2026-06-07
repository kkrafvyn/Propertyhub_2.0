import { getSupabaseClient, verifyToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

function fallbackForMissingTable(error: any, fallback: any) {
  if (error?.code === "PGRST205" || error?.code === "42P01") return fallback;
  throw error;
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
      let query = supabase.from("smart_devices").select("*").order("created_at", { ascending: false });
      if (propertyId) query = query.eq("property_id", propertyId);
      const { data, error } = await query;
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "get") {
      const { data, error } = await supabase.from("smart_devices").select("*").eq("id", deviceId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "create") {
      const body = await req.json();
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
      const body = await req.json();
      const { data, error } = await supabase.from("smart_devices").update(body).eq("id", deviceId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete") {
      const { error } = await supabase.from("smart_devices").delete().eq("id", deviceId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "POST" && action === "command") {
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
      const { data, error } = await supabase.from("smart_automation_rules").update(body).eq("id", ruleId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "DELETE" && action === "delete-rule") {
      const ruleId = url.searchParams.get("ruleId");
      const { error } = await supabase.from("smart_automation_rules").delete().eq("id", ruleId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    if (req.method === "GET" && action === "alerts") {
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
      const { data, error } = await supabase.from("smart_alerts").select("*").eq("id", alertId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "dismiss-alert") {
      const alertId = url.searchParams.get("alertId");
      const { data, error } = await supabase.from("smart_alerts").update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
      }).eq("id", alertId).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "alert-preferences") {
      const userId = url.searchParams.get("userId") || user.id;
      const { data, error } = await supabase.from("alert_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "PUT" && action === "alert-preferences") {
      const userId = url.searchParams.get("userId") || user.id;
      const body = await req.json();
      const { data, error } = await supabase.from("alert_preferences").upsert({ user_id: userId, ...body }).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data);
    }

    if (req.method === "GET" && action === "logs") {
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
      const { data, error } = await supabase
        .from("smart_devices")
        .select("status,battery_level,signal_strength,last_seen")
        .eq("id", deviceId)
        .maybeSingle();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data || null);
    }

    if (req.method === "PUT" && action === "status") {
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
      const body = await req.json();
      const { data, error } = await supabase.from("device_sharing").insert([{
        device_id: deviceId,
        shared_with: body.userId,
        permissions: body.permissions || "view",
      }]).select().single();
      if (error) return jsonResponse(fallbackForMissingTable(error, null));
      return jsonResponse(data, 201);
    }

    if (req.method === "GET" && action === "shared") {
      const userId = url.searchParams.get("userId") || user.id;
      const { data, error } = await supabase.from("device_sharing").select("*, device:device_id(*)").eq("shared_with", userId);
      if (error) return jsonResponse(fallbackForMissingTable(error, []));
      return jsonResponse(data || []);
    }

    if (req.method === "DELETE" && action === "share") {
      const shareId = url.searchParams.get("shareId");
      const { error } = await supabase.from("device_sharing").delete().eq("id", shareId);
      if (error) return jsonResponse(fallbackForMissingTable(error, { ok: true }));
      return jsonResponse({ ok: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Internal server error", 500);
  }
});
