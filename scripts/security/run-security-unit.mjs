#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";

const SECURITY_TESTS = [
  "src/lib/security/api-authorization.test.ts",
  "src/lib/platform-access.test.ts",
  "src/lib/security/rls-policy-audit.test.ts",
  "src/lib/security/storage-isolation.test.ts",
  "src/lib/security/platform-admin-live.test.ts",
  "src/lib/security/upload-validation.test.ts",
];

function main() {
  const args = ["run", "test", "--", ...SECURITY_TESTS];
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  const status = result.status === 0 ? "PASS" : "FAIL";
  writeSecurityResult(outputDir, "security-unit", status, {
    tests: SECURITY_TESTS,
    exitCode: result.status,
  });

  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  console.log(`Security unit tests: ${status}`);
  process.exit(result.status ?? 1);
}

main();
