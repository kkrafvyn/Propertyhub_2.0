#!/usr/bin/env node
import { writeSecurityResult } from "./lib/security-result.mjs";

const [, , job, status, detailsJson = "{}"] = process.argv;

if (!job || !status) {
  console.error("Usage: node record-job-result.mjs <job> <status> [jsonDetails]");
  process.exit(1);
}

writeSecurityResult(
  process.env.SECURITY_RESULTS_DIR || "security-results",
  job,
  /** @type {import('./lib/security-result.mjs').SecurityStatus} */ (status),
  JSON.parse(detailsJson),
);

console.log(`Recorded ${job}: ${status}`);
