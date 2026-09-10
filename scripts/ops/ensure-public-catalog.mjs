#!/usr/bin/env node
/**
 * Report (and optionally fix) public catalog visibility blockers.
 * Uses existing SUPABASE_SERVICE_ROLE_KEY from root .env — does not set API keys.
 *
 * Usage:
 *   npm run ops:ensure-public-catalog
 *   npm run ops:ensure-public-catalog -- --fix
 *   npm run ops:ensure-public-catalog -- --seed [--org-slug siabanku] [--write-env]
 */
import { loadProjectEnv, upsertRootEnv } from "../load-project-env.mjs";

const fix = process.argv.includes("--fix");
const seed = process.argv.includes("--seed");
const writeEnv = process.argv.includes("--write-env");
const orgSlugArg = process.argv.find((arg) => arg.startsWith("--org-slug="))?.split("=")[1]?.trim();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function resolveServiceRoleKey(env) {
  const fromEnv = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;

  const token = env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef =
    env.SUPABASE_PROJECT_REF?.trim() ||
    (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");
  if (!token || !projectRef) return "";

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return "";

  const keys = await response.json();
  const service = Array.isArray(keys)
    ? keys.find((entry) => entry.name === "service_role")
    : keys?.service_role;
  return service?.api_key?.trim() || "";
}

async function main() {
  const env = loadProjectEnv();
  const baseUrl = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = await resolveServiceRoleKey(env);

  if (!baseUrl || !serviceKey) {
    fail("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ACCESS_TOKEN) required");
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const listingsRes = await fetch(
    `${baseUrl}/rest/v1/listings?select=id,status,visibility,organization_id,organization:organizations(id,name,slug,verified,suspended)&status=eq.listed&visibility=eq.public&limit=100`,
    { headers }
  );
  const listings = await listingsRes.json();
  if (!listingsRes.ok) {
    fail(`Listings query failed: ${listingsRes.status} ${JSON.stringify(listings)}`);
  }

  const rows = Array.isArray(listings) ? listings : [];
  const blocked = rows.filter((row) => {
    const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;
    return !org?.verified || org?.suspended;
  });

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    listedPublicCount: rows.length,
    blockedByOrgVerification: blocked.length,
    blockedOrgs: blocked.map((row) => {
      const org = Array.isArray(row.organization) ? row.organization[0] : row.organization;
      return {
        listingId: row.id,
        organizationId: row.organization_id,
        orgName: org?.name,
        orgSlug: org?.slug,
        verified: org?.verified,
        suspended: org?.suspended,
      };
    }),
  }, null, 2));

  if (fix && blocked.length > 0) {
    const orgIds = [...new Set(blocked.map((row) => row.organization_id).filter(Boolean))];
    for (const orgId of orgIds) {
      const patchRes = await fetch(`${baseUrl}/rest/v1/organizations?id=eq.${orgId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ verified: true, suspended: false }),
      });
      if (!patchRes.ok) {
        const body = await patchRes.text();
        fail(`Failed to verify org ${orgId}: ${patchRes.status} ${body.slice(0, 200)}`);
      }
      console.log(`✓ Verified organization ${orgId}`);
    }
  } else if (blocked.length > 0) {
    console.log("\nRun with --fix to set verified=true on orgs with listed public listings.");
  }

  if (!seed || rows.length > 0) {
    return;
  }

  const preferredSlug = orgSlugArg || process.env.PILOT_ORG_SLUG?.trim() || "siabanku";
  const orgRes = await fetch(
    `${baseUrl}/rest/v1/organizations?select=id,name,slug,verified,suspended&slug=eq.${encodeURIComponent(preferredSlug)}&limit=1`,
    { headers },
  );
  const orgRows = await orgRes.json();
  if (!orgRes.ok) {
    fail(`Organization lookup failed: ${orgRes.status} ${JSON.stringify(orgRows)}`);
  }

  let org = Array.isArray(orgRows) ? orgRows[0] : null;
  if (!org) {
    const fallbackRes = await fetch(
      `${baseUrl}/rest/v1/organizations?select=id,name,slug,verified,suspended&verified=eq.true&suspended=eq.false&order=created_at.desc&limit=1`,
      { headers },
    );
    const fallbackRows = await fallbackRes.json();
    org = Array.isArray(fallbackRows) ? fallbackRows[0] : null;
  }
  if (!org?.id) {
    fail("No verified organization found — create a pilot org first");
  }

  const propertyRes = await fetch(`${baseUrl}/rest/v1/properties`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      organization_id: org.id,
      address: "Pilot Showcase Apartment",
      city: "Accra",
      region: "Greater Accra",
      country: "Ghana",
      category: "apartment",
      bedrooms: 2,
      bathrooms: 1,
      description: "Pilot catalog seed listing for BaytMiftah controlled rollout.",
    }),
  });
  const property = await propertyRes.json();
  if (!propertyRes.ok) {
    fail(`Property seed failed: ${propertyRes.status} ${JSON.stringify(property)}`);
  }
  const propertyId = Array.isArray(property) ? property[0]?.id : property?.id;
  if (!propertyId) fail("Property seed returned no id");

  const listingRes = await fetch(`${baseUrl}/rest/v1/listings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      property_id: propertyId,
      organization_id: org.id,
      listing_type: "rental",
      price: 2500,
      currency: "GHS",
      status: "listed",
      visibility: "public",
      published_at: new Date().toISOString(),
    }),
  });
  const listing = await listingRes.json();
  if (!listingRes.ok) {
    fail(`Listing seed failed: ${listingRes.status} ${JSON.stringify(listing)}`);
  }
  const listingId = Array.isArray(listing) ? listing[0]?.id : listing?.id;
  if (!listingId) fail("Listing seed returned no id");

  console.log(JSON.stringify({
    seeded: true,
    organizationId: org.id,
    organizationSlug: org.slug,
    propertyId,
    listingId,
  }, null, 2));

  if (writeEnv) {
    upsertRootEnv({
      PILOT_TEST_LISTING_ID: listingId,
      PILOT_TEST_ORG_ID: org.id,
      PILOT_ORG_SLUG: org.slug,
    });
    console.log("✓ Wrote PILOT_TEST_LISTING_ID, PILOT_TEST_ORG_ID, PILOT_ORG_SLUG to .env");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
