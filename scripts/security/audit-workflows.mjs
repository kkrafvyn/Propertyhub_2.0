#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { writeSecurityResult } from "./lib/security-result.mjs";

const workflowsDir = path.resolve(process.cwd(), ".github/workflows");
const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const requirePinnedActions = process.env.REQUIRE_PINNED_ACTIONS === "1";

const findings = [];

function addFinding(severity, file, message) {
  findings.push({ severity, file, message });
}

function scanWorkflow(filePath, content) {
  const rel = path.relative(process.cwd(), filePath);

  if (/pull_request_target:/m.test(content)) {
    addFinding("HIGH", rel, "Uses pull_request_target — review untrusted code access to secrets.");
  }

  if (/permissions:\s*\n\s*contents:\s*write/m.test(content) && !/workflow_dispatch:/m.test(content)) {
    addFinding("MEDIUM", rel, "Broad contents:write permission on a non-dispatch workflow.");
  }

  if (/secrets\.[A-Z0-9_]+/m.test(content) && /pull_request:/m.test(content) && !/if:\s*github\.event_name/m.test(content)) {
    addFinding("MEDIUM", rel, "Secrets referenced on pull_request — verify fork PR safety.");
  }

  if (/\$\{\{\s*github\.event\.(issue|comment|discussion)\.body\s*\}\}/m.test(content)) {
    addFinding("HIGH", rel, "Untrusted GitHub event body interpolated into a step.");
  }

  for (const line of content.split("\n")) {
    const action = line.trim().match(/^-?\s*uses:\s*([^\s#]+)$/);
    if (!action) continue;
    const reference = action[1];
    if (!/@(?:sha256:[a-f0-9]{64}|[0-9a-f]{40})$/i.test(reference)) {
      addFinding(
        requirePinnedActions ? "HIGH" : "MEDIUM",
        rel,
        `Action is not pinned to an immutable commit: ${reference}`,
      );
    }
  }

  for (const line of content.split("\n")) {
    if (/run:\s*.*\$\{\{\s*github\.event\.pull_request\.(head|title|body)/.test(line)) {
      addFinding("HIGH", rel, "Untrusted pull_request field interpolated into shell command.");
    }
  }
}

function main() {
  for (const file of readdirSync(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))) {
    const fullPath = path.join(workflowsDir, file);
    scanWorkflow(fullPath, readFileSync(fullPath, "utf8"));
  }

  const blocking = findings.filter((row) => row.severity === "HIGH" || row.severity === "CRITICAL");
  const status = blocking.length > 0 ? "FAIL" : "PASS";

  writeSecurityResult(outputDir, "actions-audit", status, {
    findings,
    blockingCount: blocking.length,
  });

  console.log(`Actions security audit: ${status}`);
  for (const finding of findings) {
    console.log(`  [${finding.severity}] ${finding.file}: ${finding.message}`);
  }

  if (status === "FAIL") process.exit(1);
}

main();
