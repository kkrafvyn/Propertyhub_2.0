#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";

function main() {
  spawnSync("node", ["scripts/security/seed-tenant-isolation-fixtures.mjs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "true" },
  });

  const result = spawnSync(
    "npm",
    ["run", "test", "--", "src/lib/security/tenant-isolation.test.ts"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      env: { ...process.env, RUN_TENANT_ISOLATION_TESTS: "true" },
    },
  );

  const fixturesConfigured = Boolean(
    process.env.VITE_SUPABASE_TEST_URL &&
      process.env.VITE_SUPABASE_TEST_ANON_KEY &&
      process.env.VITE_SUPABASE_TEST_TENANT_A_ID &&
      process.env.VITE_SUPABASE_TEST_TENANT_B_ID,
  );

  let status = "UNVERIFIED";
  if (!fixturesConfigured) {
    status = "UNVERIFIED";
  } else if (result.status === 0) {
    status = "PASS";
  } else {
    status = "FAIL";
  }

  writeSecurityResult(outputDir, "tenant-isolation", status, {
    fixturesConfigured,
    exitCode: result.status,
  });

  console.log(`Tenant isolation: ${status}`);
  if (status === "FAIL") process.exit(1);
  if (status === "UNVERIFIED") process.exit(0);
}

main();
