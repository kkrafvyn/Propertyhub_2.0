import { getSupabaseClient, requireOrganizationAccess, verifyToken } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const LISTING_SELECT =
  "*, property:properties(*), organization:organizations(id,name,slug,description,logo_url,banner_url,verified,verification_status)";

async function attachMedia(supabase: ReturnType<typeof getSupabaseClient>, listings: any[]) {
  const propertyIds = [...new Set(listings.map((item) => item.property_id).filter(Boolean))];
  if (propertyIds.length === 0) return listings;

  const { data, error } = await supabase
    .from("property_media")
    .select("*")
    .in("property_id", propertyIds)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const byProperty = new Map<string, any[]>();
  for (const item of data || []) {
    const existing = byProperty.get(item.property_id) || [];
    existing.push(item);
    byProperty.set(item.property_id, existing);
  }

  return listings.map((listing) => ({
    ...listing,
    media: byProperty.get(listing.property_id) || [],
  }));
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "listings";

    if (req.method === "GET" && action === "listings") {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("visibility", "public")
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) throw error;
      return jsonResponse(await attachMedia(supabase, data || []));
    }

    if (req.method === "GET" && action === "organizations") {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,description,logo_url,banner_url,verified,verification_status")
        .order("name", { ascending: true });

      if (error) throw error;
      return jsonResponse(data || []);
    }

    if (req.method === "GET" && action === "owned-organization") {
      const user = await verifyToken(req.headers.get("Authorization") || undefined);
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,verified,verification_status")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return jsonResponse(data || null);
    }

    if (req.method === "POST" && action === "create-listing") {
      const user = await verifyToken(req.headers.get("Authorization") || undefined);
      const body = await req.json();
      const property = body.property || {};
      const listing = body.listing || {};
      const organizationId = body.organizationId || property.organization_id || listing.organization_id;

      if (!organizationId) {
        return errorResponse("An organization is required before creating a listing", 400);
      }

      await requireOrganizationAccess(supabase, user, organizationId);

      const { data: createdProperty, error: propertyError } = await supabase
        .from("properties")
        .insert([{
          ...property,
          organization_id: organizationId,
          country: property.country || "Ghana",
        }])
        .select()
        .single();

      if (propertyError) throw propertyError;

      const { data: createdListing, error: listingError } = await supabase
        .from("listings")
        .insert([{
          ...listing,
          property_id: createdProperty.id,
          organization_id: organizationId,
          status: listing.status || "listed",
          visibility: listing.visibility || "public",
          published_at: listing.published_at || new Date().toISOString(),
          verification_status: listing.verification_status || "submitted",
        }])
        .select(LISTING_SELECT)
        .single();

      if (listingError) throw listingError;
      const [withMedia] = await attachMedia(supabase, [createdListing]);
      return jsonResponse(withMedia, 201);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    const message = error.message || "Internal server error";
    const status = message.includes("Authentication") || message.includes("Authorization")
      ? 401
      : message.includes("access required")
      ? 403
      : 500;
    return errorResponse(message, status);
  }
});
