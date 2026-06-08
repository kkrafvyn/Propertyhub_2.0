import {
  getOrganizationAccess,
  getSupabaseClient,
  isAdmin,
  verifyToken,
} from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  asString,
  assertUserTarget,
  requireObject,
  requireString,
  requireUuid,
} from "../_shared/security.ts";

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

const tableByType: Record<string, string> = {
  saved_search: "saved_searches",
  offer_packet: "offer_packets",
  audit_event: "audit_events",
  team_invite: "agency_invitations",
  e_sign_packet: "e_sign_packets",
};

async function requireOrganizationForInvite(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: Awaited<ReturnType<typeof verifyToken>>,
  body: Record<string, unknown>,
) {
  const agencyId = requireUuid(
    body.agencyId || body.agency_id || body.organizationId || body.organization_id,
    "agencyId",
  );
  const access = await getOrganizationAccess(supabase, user, agencyId);
  if (!access.allowed) throw new Error("Organization access required");
  return agencyId;
}

async function buildPayload(
  supabase: ReturnType<typeof getSupabaseClient>,
  type: string,
  user: Awaited<ReturnType<typeof verifyToken>>,
  body: Record<string, unknown>,
) {
  if (type === "saved_search") {
    return {
      user_id: user.id,
      name: asString(body.name) || asString(body.query) || "Saved search",
      query: asString(body.query) || null,
      filters: body.filters || {
        category: body.category || null,
        priceRange: body.priceRange || null,
      },
      alert_frequency: asString(body.alertFrequency) || "instant",
      metadata: body,
    };
  }

  if (type === "offer_packet") {
    return {
      user_id: user.id,
      listing_id: body.listingId || body.listing_id
        ? requireUuid(body.listingId || body.listing_id, "listingId")
        : null,
      status: asString(body.status) || "drafted",
      signature_status: asString(body.signatureStatus || body.signature_status) || "pending",
      metadata: body,
    };
  }

  if (type === "e_sign_packet") {
    return {
      user_id: user.id,
      offer_packet_id: body.offerPacketId || body.offer_packet_id || body.id || null,
      provider: asString(body.provider) || "manual",
      status: asString(body.signatureStatus || body.status) || "pending",
      signed_at: asString(body.signed_at || body.signedAt) || null,
      metadata: body,
    };
  }

  if (type === "team_invite") {
    const agencyId = await requireOrganizationForInvite(supabase, user, body);
    return {
      agency_id: agencyId,
      email: requireString(body.email, "email").toLowerCase(),
      role: asString(body.role) || "agency_agent",
      status: "pending",
    };
  }

  if (type === "audit_event") {
    if (!isAdmin(user)) throw new Error("Admin access required");
    return {
      user_id: assertUserTarget(user, body.userId || body.user_id),
      actor: user.email || user.id,
      action: asString(body.action) || "Recorded audit event",
      entity: asString(body.entity) || "System",
      severity: asString(body.severity) || "info",
      metadata: body,
    };
  }

  throw new Error("Unknown persistence type");
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "save";
    const type = url.searchParams.get("type") || "";
    const table = tableByType[type];
    const user = await verifyToken(req.headers.get("Authorization") || undefined);
    if (!table) return errorResponse("Unknown persistence type", 400);

    if (req.method === "GET" && action === "list") {
      let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(50);
      if (type === "audit_event" && !isAdmin(user)) throw new Error("Admin access required");
      if (type !== "audit_event" && type !== "team_invite") query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "save") {
      const body = requireObject(await req.json());
      const payload = await buildPayload(supabase, type, user, body);
      const { data, error } = await supabase.from(table).insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { id: null, ...payload }, error ? 200 : 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    return errorResponse(error.message || "Persistence function failed", 400);
  }
});
