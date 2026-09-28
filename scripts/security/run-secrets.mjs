#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import path from "node:path";
import { resolveSecurityTool, runResolvedTool } from "./lib/resolve-tool.mjs";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const strict = process.argv.includes("--strict") || process.env.SECURITY_STRICT === "1";

function main() {
  const resolved = resolveSecurityTool("gitleaks");
  if (!resolved) {
    writeSecurityResult(outputDir, "secrets", "UNVERIFIED", {
      reason: "Run npm run security:install-tools or install Docker",
    });
    console.log("Secrets scan: UNVERIFIED — run npm run security:install-tools");
    process.exit(strict ? 1 : 0);
  }

  mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "gitleaks-report.json");

  const args =
    resolved.via === "docker"
      ? ["--redact", "--report-path", `/repo/${path.relative(process.cwd(), reportPath).replace(/\\/g, "/")}`, "--verbose"]
      : [
          "detect",
          "--source",
          ".",
          "--config",
          ".gitleaks.toml",
          "--redact",
          "--report-path",
          reportPath,
          "--verbose",
        ];

  const scan = runResolvedTool(resolved, args);
  const status = scan.status === 0 ? "PASS" : scan.status === 1 ? "FAIL" : "UNVERIFIED";

  writeSecurityResult(outputDir, "secrets", status, {
    tool: "gitleaks",
    via: resolved.via,
    exitCode: scan.status,
    reportPath: path.relative(process.cwd(), reportPath),
  });

  if (scan.stdout) console.log(scan.stdout);
  if (scan.stderr) console.error(scan.stderr);
  console.log(`Secrets scan: ${status}`);

  if (status === "FAIL") {
    console.error("Secret detected. Rotate affected credentials and remove values from git history.");
    process.exit(1);
  }
  if (status === "UNVERIFIED") process.exit(strict ? 1 : 0);
}

main();
