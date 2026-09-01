#!/usr/bin/env node
/**
 * Documents and validates tenant-isolation CI fixture configuration.
 * Does not create Supabase users — configure secrets in GitHub Actions instead.
 *
 * Required GitHub secrets (all six):
 *   VITE_SUPABASE_TEST_URL
 *   VITE_SUPABASE_TEST_ANON_KEY
 *   VITE_SUPABASE_TEST_TENANT_A_TOKEN
 *   VITE_SUPABASE_TEST_TENANT_B_TOKEN
 *   VITE_SUPABASE_TEST_TENANT_A_ID
 *   VITE_SUPABASE_TEST_TENANT_B_ID
 *
 * Fixture setup checklist:
 *   1. Create two organizations (Tenant A / Tenant B) in a non-production Supabase project.
 *   2. Add one finance-capable member per org; capture JWT access tokens after sign-in.
 *   3. Seed at least one bank_feed_connections row per org for cross-tenant proof.
 *   4. Store the six values as GitHub repository secrets — no API keys required in repo files.
 */
const REQUIRED = [
  "VITE_SUPABASE_TEST_URL",
  "VITE_SUPABASE_TEST_ANON_KEY",
  "VITE_SUPABASE_TEST_TENANT_A_TOKEN",
  "VITE_SUPABASE_TEST_TENANT_B_TOKEN",
  "VITE_SUPABASE_TEST_TENANT_A_ID",
  "VITE_SUPABASE_TEST_TENANT_B_ID",
];

const present = REQUIRED.filter((name) => Boolean(process.env[name]?.trim()));
const missing = REQUIRED.filter((name) => !process.env[name]?.trim());

console.log("\nTenant isolation fixture status\n");
console.log(`Configured: ${present.length}/${REQUIRED.length}`);

if (present.length) {
  console.log("\nPresent:");
  for (const name of present) console.log(`  ✓ ${name}`);
}

if (missing.length) {
  console.log("\nMissing (live RLS tests will skip):");
  for (const name of missing) console.log(`  - ${name}`);
}

console.log("\nSee scripts/security/seed-tenant-isolation-fixtures.mjs header for setup steps.\n");
process.exit(missing.length === REQUIRED.length ? 0 : 0);
