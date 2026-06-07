import { getSupabaseClient, maybeVerifyToken, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

const fallbackPlans = [
  {
    audience: "agency",
    code: "agency_starter",
    name: "Agency Starter",
    price_monthly: 0,
    currency: "GHS",
    featured_listing_credits: 1,
    seat_limit: 3,
    listing_limit: 25,
    capabilities: ["Verified agency profile", "Lead inbox", "Basic analytics"],
  },
  {
    audience: "agency",
    code: "agency_professional",
    name: "Agency Professional",
    price_monthly: 650,
    currency: "GHS",
    featured_listing_credits: 10,
    seat_limit: 15,
    listing_limit: 250,
    capabilities: ["Advanced CRM", "Featured listings", "Team permissions", "Market analytics"],
  },
  {
    audience: "agency",
    code: "agency_enterprise",
    name: "Agency Enterprise",
    price_monthly: 2500,
    currency: "GHS",
    featured_listing_credits: 50,
    seat_limit: null,
    listing_limit: null,
    capabilities: ["Unlimited listings", "Priority verification", "Fraud review queue", "Dedicated support"],
  },
];

function missingTable(error: any) {
  return ["PGRST205", "42P01"].includes(error?.code);
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "plans";
    const authHeader = req.headers.get("Authorization") || undefined;
    const user = await maybeVerifyToken(authHeader);

    if (req.method === "GET" && action === "plans") {
      const audience = url.searchParams.get("audience");
      let query = supabase.from("subscription_plans").select("*").eq("active", true).order("price_monthly");
      if (audience) query = query.eq("audience", audience);
      const { data, error } = await query;
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data?.length ? data : fallbackPlans.filter((plan) => !audience || plan.audience === audience));
    }

    if (req.method === "GET" && action === "subscription") {
      const currentUser = user || await verifyToken(authHeader);
      const organizationId = url.searchParams.get("organizationId");
      if (!organizationId) return errorResponse("organizationId is required", 400);
      await requireOrganizationAccess(supabase, currentUser, organizationId);

      const { data, error } = await supabase
        .from("organization_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || null);
    }

    if (req.method === "GET" && action === "featured-campaigns") {
      const currentUser = user || await verifyToken(authHeader);
      const organizationId = url.searchParams.get("organizationId");
      if (!organizationId) return errorResponse("organizationId is required", 400);
      await requireOrganizationAccess(supabase, currentUser, organizationId);

      const { data, error } = await supabase
        .from("featured_listing_campaigns")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "POST" && action === "create-featured-campaign") {
      const currentUser = user || await verifyToken(authHeader);
      const body = await req.json();
      const organizationId = body.organizationId || body.organization_id;
      if (!organizationId) return errorResponse("organizationId is required", 400);
      await requireOrganizationAccess(supabase, currentUser, organizationId);

      const payload = {
        listing_id: body.listingId || body.listing_id,
        organization_id: organizationId,
        status: body.status || "scheduled",
        placement: body.placement || "search_top",
        budget: body.budget || 0,
        currency: body.currency || "GHS",
        starts_at: body.startsAt || body.starts_at || new Date().toISOString(),
        ends_at: body.endsAt || body.ends_at || null,
        created_by: currentUser.id,
      };
      if (!payload.listing_id) return errorResponse("listingId is required", 400);

      const { data, error } = await supabase.from("featured_listing_campaigns").insert([payload]).select().single();
      if (error && !missingTable(error)) throw error;
      return jsonResponse(data || { ...payload, id: null }, error ? 200 : 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    const message = error.message || "Internal server error";
    const status = message.includes("Authentication") || message.includes("Invalid token")
      ? 401
      : message.includes("access required")
      ? 403
      : 500;
    return errorResponse(message, status);
  }
});
