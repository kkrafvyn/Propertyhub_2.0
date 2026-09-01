#!/usr/bin/env node
/**
 * Documents and validates tenant-isolation CI fixture configuration.
 *
 * Provision fixtures:
 *   npm run security:provision-tenant-fixtures
 *   npm run security:provision-tenant-fixtures -- --gh-secrets
 *
 * Required GitHub secrets (all six):
 *   VITE_SUPABASE_TEST_URL
 *   VITE_SUPABASE_TEST_ANON_KEY
 *   VITE_SUPABASE_TEST_TENANT_A_TOKEN
 *   VITE_SUPABASE_TEST_TENANT_B_TOKEN
 *   VITE_SUPABASE_TEST_TENANT_A_ID
 *   VITE_SUPABASE_TEST_TENANT_B_ID
 */
import { loadProjectEnv } from "../load-project-env.mjs";

loadProjectEnv();
const REQUIRED = [
  "VITE_SUPABASE_TEST_URL",
  "VITE_SUPABASE_TEST_ANON_KEY",
  "VITE_SUPABASE_TEST_TENANT_A_TOKEN",
  "VITE_SUPABASE_TEST_TENANT_B_TOKEN",
  "VITE_SUPABASE_TEST_TENANT_A_ID",
  "VITE_SUPABASE_TEST_TENANT_B_ID",
];

const strict =
  process.env.CI === "true" ||
  process.argv.includes("--strict") ||
  process.argv.includes("--require-all");

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
  console.log("\nRun: npm run security:provision-tenant-fixtures -- --gh-secrets\n");
}

if (strict && missing.length > 0) {
  console.error("Tenant isolation fixtures are required in CI.");
  process.exit(1);
}

console.log("");
process.exit(0);
