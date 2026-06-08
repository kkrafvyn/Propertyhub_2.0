import {
  AuthenticatedUser,
  getOrganizationAccess,
  getSupabaseClient,
  isAdmin,
} from "./auth.ts";

export function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function requireString(value: unknown, name: string) {
  const next = asString(value);
  if (!next) throw new Error(`${name} is required`);
  return next;
}

export function requireUuid(value: unknown, name: string) {
  const next = requireString(value, name);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(next)
  ) {
    throw new Error(`${name} must be a valid UUID`);
  }
  return next;
}

export function assertAllowedStatus(status: string, allowed: string[]) {
  if (!allowed.includes(status)) throw new Error("Unsupported status");
  return status;
}

export function assertUserTarget(user: AuthenticatedUser, targetUserId?: unknown) {
  const target = asString(targetUserId);
  if (target && target !== user.id && !isAdmin(user)) {
    throw new Error("Cannot act for another user");
  }
  return target || user.id;
}

export async function requireListingManager(user: AuthenticatedUser, listingId: string) {
  const supabase = getSupabaseClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, organization_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw error;
  if (!listing) throw new Error("Listing not found");
  if (!listing.organization_id) {
    if (!isAdmin(user)) throw new Error("Listing is not attached to an organization");
    return listing;
  }

  const access = await getOrganizationAccess(supabase, user, listing.organization_id);
  if (!access.allowed) throw new Error("Listing access required");
  return listing;
}
