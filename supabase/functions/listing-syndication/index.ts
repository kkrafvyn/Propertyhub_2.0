import { getCorsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { requireOrgMembership } from "../_shared/org-auth.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";
import {
  buildListingProviderRequest,
  getListingProviderConfig,
  normalizeListingFeed,
  type ListingProvider,
} from "../_shared/listing-syndication.ts";

const SYNDICATION_ROLES = [
  "owner",
  "organization_admin",
  "managing_director",
  "property_manager",
  "operations",
] as const;
const PROVIDERS: ListingProvider[] = ["mls", "zillow", "realtor"];
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024;

function parseProvider(value: unknown): ListingProvider {
  if (typeof value === "string" && PROVIDERS.includes(value as ListingProvider)) {
    return value as ListingProvider;
  }
  throw new HttpError(400, "provider must be mls, zillow, or realtor");
}

async function readProviderPayload(provider: ListingProvider) {
  const config = getListingProviderConfig(provider);
  if (!config) {
    const prefix = provider.toUpperCase();
    throw new HttpError(503, `${prefix} is not configured. Set ${prefix}_API_KEY and ${prefix}_FEED_URL.`);
  }
  const request = buildListingProviderRequest(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new HttpError(502, `${provider.toUpperCase()} feed request failed (${response.status})`);
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new HttpError(502, "Listing feed response is too large");
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) throw new HttpError(502, "Listing feed response is too large");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HttpError(502, "Listing feed must return JSON or RESO Web API JSON");
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function runSync(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  provider: ListingProvider,
) {
  const { data: job, error: jobError } = await admin.from("listing_sync_jobs").insert({
    organization_id: organizationId,
    provider,
    status: "in_progress",
  }).select("id,organization_id,provider,status,started_at").single();
  if (jobError || !job) throw new HttpError(500, jobError?.message || "Unable to create listing sync job");

  try {
    const payload = await readProviderPayload(provider);
    const listings = normalizeListingFeed(payload, provider);
    if (!listings.length) throw new HttpError(502, `${provider.toUpperCase()} returned no listings with stable identifiers`);

    let successful = 0;
    let failed = 0;
    for (const listing of listings) {
      const { error } = await admin.from("external_listings").upsert({
        organization_id: organizationId,
        ...listing,
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,provider,external_id" });
      if (error) {
        console.error("Listing upsert failed", { provider, externalId: listing.external_id, error: error.message });
        failed += 1;
      } else {
        successful += 1;
      }
    }

    const completedAt = new Date().toISOString();
    const { error: completeError } = await admin.from("listing_sync_jobs").update({
      status: "completed",
      listings_sync: successful,
      listings_failed: failed,
      completed_at: completedAt,
      error_message: null,
    }).eq("id", job.id);
    if (completeError) throw new HttpError(500, completeError.message);
    return { ...job, status: "completed", listings_sync: successful, listings_failed: failed, completed_at: completedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Listing sync failed";
    await admin.from("listing_sync_jobs").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, req);

  try {
    const { user } = await requireAuthenticatedUser(req.headers.get("Authorization"));
    const body = await req.json().catch(() => null);
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "status";
    if (!organizationId) throw new HttpError(400, "organizationId is required");

    const admin = createAdminClient();
    await requireOrgMembership(admin, user.id, organizationId, SYNDICATION_ROLES);

    if (action === "status") {
      return jsonResponse(200, {
        providers: PROVIDERS.map((provider) => ({
          provider,
          configured: Boolean(getListingProviderConfig(provider)),
          authentication: "server-managed",
        })),
      }, req);
    }
    if (action !== "sync") throw new HttpError(400, "action must be status or sync");

    const provider = parseProvider(body?.provider);
    const job = await runSync(admin, organizationId, provider);
    return jsonResponse(200, { ok: true, job }, req);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse(error.status, { error: error.message }, req);
    console.error("listing-syndication error", error);
    return jsonResponse(500, { error: "Unable to synchronize listings" }, req);
  }
});
