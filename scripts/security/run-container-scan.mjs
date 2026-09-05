#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import path from "node:path";
import { resolveSecurityTool, runResolvedTool } from "./lib/resolve-tool.mjs";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";

function main() {
  const resolved = resolveSecurityTool("trivy");
  if (!resolved) {
    writeSecurityResult(outputDir, "container", "UNVERIFIED", {
      reason: "Install Docker or Trivy CLI, then re-run npm run security:container",
    });
    console.log("Container/filesystem scan: UNVERIFIED (trivy/docker not available)");
    process.exit(0);
  }

  mkdirSync(outputDir, { recursive: true });
  const args =
    resolved.via === "docker"
      ? [
          "/repo",
          "--severity",
          "CRITICAL",
          "--exit-code",
          "1",
          "--ignore-unfixed",
          "--scanners",
          "vuln,secret,misconfig",
        ]
      : [
          "fs",
          ".",
          "--severity",
          "CRITICAL",
          "--exit-code",
          "1",
          "--ignore-unfixed",
          "--scanners",
          "vuln,secret,misconfig",
        ];

  const scan = runResolvedTool(resolved, args);
  const status = scan.status === 0 ? "PASS" : scan.status === 1 ? "FAIL" : "UNVERIFIED";

  writeSecurityResult(outputDir, "container", status, {
    tool: "trivy-fs",
    via: resolved.via,
    note: "No Docker image in repo; filesystem + dependency CVE scan",
    exitCode: scan.status,
  });

  if (scan.stdout) console.log(scan.stdout);
  if (scan.stderr) console.error(scan.stderr);
  console.log(`Container/filesystem scan: ${status}`);
  if (status === "FAIL") process.exit(1);
}

main();
