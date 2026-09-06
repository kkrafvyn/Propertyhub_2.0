#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { isBlockingStatus, isUnverifiedStatus } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const resultsDir = process.argv[2] || outputDir;

/** @type {Record<string, string>} */
const LABELS = {
  "sast-semgrep": "SAST (Semgrep)",
  "sast-codeql": "SAST (CodeQL)",
  sca: "SCA",
  secrets: "Secrets",
  "actions-audit": "Actions Security",
  "security-unit": "API Authorization",
  "tenant-isolation": "Tenant Isolation",
  storage: "Storage Isolation",
  "platform-admin-live": "Platform Admin Live",
  "storage-isolation": "Storage Isolation Live",
  dast: "DAST",
  "dast-authenticated": "DAST (Authenticated)",
  container: "Container / FS Scan",
};

function readResult(name) {
  const file = path.join(resultsDir, `${name}.json`);
  if (!existsSync(file)) return { job: name, status: "UNVERIFIED", reason: "Result file missing" };
  return JSON.parse(readFileSync(file, "utf8"));
}

function main() {
  const knownJobs = Object.keys(LABELS);
  const discovered = readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""));

  const jobs = [...new Set([...knownJobs, ...discovered])];
  const rows = jobs.map((job) => readResult(job));

  let overall = "GREEN — SECURITY CHECKS PASSED";
  const hasFail = rows.some((row) => isBlockingStatus(row.status));
  const hasUnverified = rows.some((row) => isUnverifiedStatus(row.status));

  if (hasFail) overall = "RED — SECURITY BLOCKER";
  else if (hasUnverified) overall = "YELLOW — SECURITY CHECKS PASSED WITH UNVERIFIED ITEMS";

  const lines = [
    "BAYTMIFTAH SECURITY PIPELINE",
    "",
    ...rows.map((row) => {
      const label = LABELS[row.job] || row.job;
      const status = String(row.status || "UNVERIFIED").padEnd(12);
      return `${label.padEnd(22)} ${status}`;
    }),
    "",
    `OVERALL              ${overall}`,
    "",
  ];

  const summary = lines.join("\n");
  console.log(summary);

  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(path.join(resultsDir, "summary.json"), JSON.stringify({ overall, rows }, null, 2));
  writeFileSync(path.join(resultsDir, "summary.txt"), summary);

  if (hasFail) process.exit(1);
}

main();
