#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import path from "node:path";
import { resolveSecurityTool, runResolvedTool } from "./lib/resolve-tool.mjs";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const strict = process.argv.includes("--strict") || process.env.SECURITY_STRICT === "1";

function main() {
  const resolved = resolveSecurityTool("trivy");
  if (!resolved) {
    writeSecurityResult(outputDir, "container", "UNVERIFIED", {
      reason: "Install Docker or Trivy CLI, then re-run npm run security:container",
    });
    console.log("Container/filesystem scan: UNVERIFIED (trivy/docker not available)");
    process.exit(strict ? 1 : 0);
  }

  mkdirSync(outputDir, { recursive: true });
  const skipDirs = [
    "dist-desktop",
    "dist",
    "backups",
    "node_modules",
    "coverage",
    "android",
    "ios",
    ".agents",
  ];
  const skipFiles = [
    "supabase/.env.payments",
    "supabase/.env.local",
    ".env",
  ];
  const skipArgs = [
    ...skipDirs.flatMap((p) => ["--skip-dirs", p]),
    ...skipFiles.flatMap((p) => ["--skip-files", p]),
  ];

  const args =
    resolved.via === "docker"
      ? [
          "/repo",
          ...skipArgs,
          "--severity",
          "CRITICAL",
          "--exit-code",
          "1",
          "--ignore-unfixed",
          "--scanners",
          "vuln,misconfig",
        ]
      : [
          "fs",
          ".",
          ...skipArgs,
          "--severity",
          "CRITICAL",
          "--exit-code",
          "1",
          "--ignore-unfixed",
          "--scanners",
          "vuln,misconfig",
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
  if (status === "UNVERIFIED") process.exit(strict ? 1 : 0);
}

main();
