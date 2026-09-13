#!/usr/bin/env node
/**
 * Purge leftover pilot/demo seed rows and CI tenant fixtures from the linked project.
 *
 * Usage:
 *   npm run ops:purge-demo-seed -- --dry-run
 *   npm run ops:purge-demo-seed -- --apply
 */
import { loadProjectEnv } from "../load-project-env.mjs";

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;
const includeCiFixtures = process.argv.includes("--include-ci-fixtures");

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

async function rest(baseUrl, headers, path, init = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${path} → ${response.status} ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
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

  const pilotProperties = await rest(
    baseUrl,
    headers,
    "properties?select=id,address,organization_id&address=eq.Pilot%20Showcase%20Apartment",
  );
  const pilotPropertyIds = (Array.isArray(pilotProperties) ? pilotProperties : []).map((row) => row.id);

  const fixtureOrgs = includeCiFixtures
    ? await rest(
        baseUrl,
        headers,
        "organizations?select=id,slug,name&or=(slug.ilike.ci-tenant-isolation-*,slug.ilike.*isolation*)",
      )
    : [];
  const fixtureOrgIds = (Array.isArray(fixtureOrgs) ? fixtureOrgs : [])
    .filter((row) => String(row.slug || "").includes("isolation") || String(row.slug || "").startsWith("ci-tenant"))
    .map((row) => row.id);

  const summary = {
    mode: dryRun ? "dry-run" : "apply",
    includeCiFixtures,
    pilotShowcaseProperties: pilotPropertyIds.length,
    pilotPropertyIds,
    fixtureOrganizations: fixtureOrgIds.length,
    fixtureOrgIds,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log("Dry run only. Re-run with --apply to delete matching rows.");
    return;
  }

  if (pilotPropertyIds.length) {
    const idList = pilotPropertyIds.join(",");
    await rest(baseUrl, headers, `listings?property_id=in.(${idList})`, { method: "DELETE" });
    await rest(baseUrl, headers, `properties?id=in.(${idList})`, { method: "DELETE" });
    console.log(`✓ Removed ${pilotPropertyIds.length} Pilot Showcase property row(s) and listings`);
  }

  if (fixtureOrgIds.length) {
    const idList = fixtureOrgIds.join(",");
    await rest(baseUrl, headers, `organization_members?organization_id=in.(${idList})`, { method: "DELETE" });
    await rest(baseUrl, headers, `listings?organization_id=in.(${idList})`, { method: "DELETE" });
    await rest(baseUrl, headers, `properties?organization_id=in.(${idList})`, { method: "DELETE" });
    await rest(baseUrl, headers, `organizations?id=in.(${idList})`, { method: "DELETE" });
    console.log(`✓ Removed ${fixtureOrgIds.length} CI isolation organization(s)`);
  }

  console.log("✓ Purge complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
