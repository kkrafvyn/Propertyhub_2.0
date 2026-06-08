import { getSupabaseClient, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  asString,
  assertAllowedStatus,
  requireObject,
  requireUuid,
} from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (req.method === "GET" && action === "availability") {
      return jsonResponse({
        slots: [
          "09:00",
          "10:30",
          "12:00",
          "14:00",
          "16:00",
        ].map((time) => ({ time, available: true })),
      });
    }

    const user = await verifyToken(req.headers.get("Authorization") || undefined);

    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("viewing_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "create-viewing") {
      const body = requireObject(await req.json());
      const payload = {
        user_id: user.id,
        listing_id: body.listingId || body.listing_id
          ? requireUuid(body.listingId || body.listing_id, "listingId")
          : null,
        property_id: body.propertyId || body.property_id
          ? requireUuid(body.propertyId || body.property_id, "propertyId")
          : null,
        organization_id: body.organizationId || body.organization_id
          ? requireUuid(body.organizationId || body.organization_id, "organizationId")
          : null,
        requested_date: asString(body.requestedDate || body.requested_date) || null,
        requested_time: asString(body.requestedTime || body.requested_time) || null,
        contact_name: asString(body.contactName || body.contact_name) || null,
        contact_email: user.email || null,
        contact_phone: asString(body.contactPhone || body.contact_phone) || null,
        status: "requested",
        notes: asString(body.notes) || null,
        metadata: body,
      };
      const { data, error } = await supabase
        .from("viewing_requests")
        .insert([payload])
        .select()
        .single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    if (req.method === "PUT" && action === "update-status") {
      const body = requireObject(await req.json());
      const bookingId = requireUuid(body.bookingId || body.id, "bookingId");
      const status = assertAllowedStatus(asString(body.status), [
        "requested",
        "confirmed",
        "declined",
        "cancelled",
        "completed",
      ]);

      const { data: existing, error: lookupError } = await supabase
        .from("viewing_requests")
        .select("id,user_id,organization_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (lookupError && !missingTable(lookupError)) throw lookupError;
      if (existing?.user_id !== user.id) {
        await requireOrganizationAccess(supabase, user, existing?.organization_id);
      }

      const { data, error } = await supabase
        .from("viewing_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .select()
        .single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: bookingId, status });
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Booking function failed", 400);
  }
});
