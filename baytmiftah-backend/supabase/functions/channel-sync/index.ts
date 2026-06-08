import { getSupabaseClient, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { asString, requireObject } from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

function icsDate(value: string) {
  return value.replaceAll("-", "");
}

function renderIcs(blocks: any[]) {
  const events = blocks.map((block) => [
    "BEGIN:VEVENT",
    `UID:${block.id}@baytmiftah`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${icsDate(block.starts_on)}`,
    `DTEND;VALUE=DATE:${icsDate(block.ends_on)}`,
    `SUMMARY:${block.reason || "Occupied"}`,
    "END:VEVENT",
  ].join("\r\n"));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BaytMiftah//Availability//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "blocks";

    if (req.method === "GET" && action === "export-ics") {
      const token = url.searchParams.get("token");
      if (!token) return errorResponse("token is required", 400);
      const { data: connection, error: connectionError } = await supabase
        .from("channel_connections")
        .select("listing_id,property_id,organization_id")
        .eq("export_token", token)
        .eq("status", "active")
        .maybeSingle();
      if (connectionError && !missingTable(connectionError)) throw connectionError;
      if (!connection) return errorResponse("Calendar not found", 404);

      let query = supabase.from("availability_blocks").select("*").order("starts_on");
      if (connection.listing_id) query = query.eq("listing_id", connection.listing_id);
      else if (connection.property_id) query = query.eq("property_id", connection.property_id);
      else query = query.eq("organization_id", connection.organization_id);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return new Response(renderIcs(data || []), {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const user = await verifyToken(req.headers.get("Authorization") || undefined);

    if (req.method === "GET" && action === "blocks") {
      const organizationId = url.searchParams.get("organizationId");
      if (organizationId) await requireOrganizationAccess(supabase, user, organizationId);
      let query = supabase.from("availability_blocks").select("*").order("starts_on");
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query.limit(120);
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "block") {
      const body = requireObject(await req.json());
      const organizationId = asString(body.organizationId || body.organization_id);
      if (organizationId) await requireOrganizationAccess(supabase, user, organizationId);
      const payload = {
        property_id: asString(body.propertyId || body.property_id) || null,
        listing_id: asString(body.listingId || body.listing_id) || null,
        organization_id: organizationId || null,
        starts_on: asString(body.startsOn || body.starts_on),
        ends_on: asString(body.endsOn || body.ends_on),
        source: asString(body.source) || "baytmiftah",
        status: asString(body.status) || "occupied",
        reason: asString(body.reason) || null,
        metadata: body.metadata || body,
        created_by: user.id,
      };
      if (!payload.starts_on || !payload.ends_on) return errorResponse("Date range is required", 400);
      const { data, error } = await supabase.from("availability_blocks").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "POST" && action === "connect") {
      const body = requireObject(await req.json());
      const organizationId = asString(body.organizationId || body.organization_id);
      if (organizationId) await requireOrganizationAccess(supabase, user, organizationId);
      const payload = {
        property_id: asString(body.propertyId || body.property_id) || null,
        listing_id: asString(body.listingId || body.listing_id) || null,
        organization_id: organizationId || null,
        provider: asString(body.provider) || "ical",
        sync_type: asString(body.syncType || body.sync_type) || "ical",
        import_url: asString(body.importUrl || body.import_url) || null,
        status: "active",
        created_by: user.id,
        metadata: body.metadata || {},
      };
      const { data, error } = await supabase.from("channel_connections").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Channel sync failed", 400);
  }
});
