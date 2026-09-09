#!/usr/bin/env node
/**
 * Report (and optionally fix) public catalog visibility blockers.
 * Uses existing SUPABASE_SERVICE_ROLE_KEY from root .env — does not set API keys.
 *
 * Usage:
 *   npm run ops:ensure-public-catalog
 *   npm run ops:ensure-public-catalog -- --fix
 */
import { loadProjectEnv } from "../load-project-env.mjs";

const fix = process.argv.includes("--fix");

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

  if (!fix || blocked.length === 0) {
    if (blocked.length > 0) {
      console.log("\nRun with --fix to set verified=true on orgs with listed public listings.");
    }
    return;
  }

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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
