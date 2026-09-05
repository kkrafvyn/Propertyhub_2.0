#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const auditLevel = process.env.SECURITY_SCA_AUDIT_LEVEL || "high";

function main() {
  const audit = spawnSync("npm", ["audit", "--audit-level", auditLevel, "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  let parsed = null;
  try {
    parsed = JSON.parse(audit.stdout || "{}");
  } catch {
    parsed = null;
  }

  const metadata = parsed?.metadata?.vulnerabilities || {};
  const critical = Number(metadata.critical || 0);
  const high = Number(metadata.high || 0);
  const moderate = Number(metadata.moderate || 0);
  const low = Number(metadata.low || 0);

  const status = critical > 0 || high > 0 ? "FAIL" : "PASS";

  writeSecurityResult(outputDir, "sca", status, {
    tool: "npm-audit",
    auditLevel,
    counts: { critical, high, moderate, low },
    exitCode: audit.status,
  });

  console.log(`npm audit (${auditLevel}+): critical=${critical} high=${high} moderate=${moderate} low=${low}`);
  console.log(`SCA: ${status}`);

  if (status === "FAIL") {
    spawnSync("npm", ["audit", "--audit-level", auditLevel], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    process.exit(1);
  }
}

main();
