#!/usr/bin/env node
import { resolveSecurityTool, runResolvedTool } from "./lib/resolve-tool.mjs";
import { writeSecurityResult } from "./lib/security-result.mjs";

const outputDir = process.env.SECURITY_RESULTS_DIR || "security-results";
const strict = process.argv.includes("--strict") || process.env.SECURITY_STRICT === "1";

// p/security-audit and p/owasp-top-ten are Semgrep's canonical security
// rulesets. The language packs alone (p/javascript, p/typescript, p/react)
// mostly encode correctness/best-practice rules and miss injection,
// deserialization, SSRF, and crypto misuse classes.
const CONFIGS = [
  "p/security-audit",
  "p/owasp-top-ten",
  "p/typescript",
  "p/react",
  "p/javascript",
  ".semgrep/baytmiftah.yml",
];

const SCAN_TARGETS = ["src", "supabase/functions", "scripts", "electron"];
const DOCKER_TARGETS = SCAN_TARGETS.map((target) => `/src/${target}`);

function buildScanArgs(via) {
  const configArgs = CONFIGS.flatMap((config) => ["--config", via === "docker" ? config.replace(/^\./, "/src/") : config]);
  return [
    "scan",
    ...configArgs,
    "--error",
    // ERROR + WARNING captures the real security-audit rules (most of which are
    // WARNING), while INFO stays excluded so the rules the repo deliberately
    // demoted to INFO + `disabled: true` in .semgrep/baytmiftah.yml stay quiet.
    "--severity=ERROR",
    "--severity=WARNING",
    "--metrics=off",
    "--quiet",
    ...(via === "docker" ? DOCKER_TARGETS : SCAN_TARGETS),
  ];
}

function main() {
  const resolved = resolveSecurityTool("semgrep");
  if (!resolved) {
    writeSecurityResult(outputDir, "sast-semgrep", "UNVERIFIED", {
      reason: "Run npm run security:install-tools, py -m pip install semgrep, or install Docker",
    });
    console.log("Semgrep: UNVERIFIED — run npm run security:install-tools");
    process.exit(strict ? 1 : 0);
  }

  const result = runResolvedTool(resolved, buildScanArgs(resolved.via));
  const status = result.status === 0 ? "PASS" : result.status === 1 ? "FAIL" : "UNVERIFIED";

  writeSecurityResult(outputDir, "sast-semgrep", status, {
    tool: "semgrep",
    via: resolved.via,
    exitCode: result.status,
    output: `${result.stdout || ""}\n${result.stderr || ""}`.trim().slice(0, 8000),
  });

  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  console.log(`Semgrep SAST: ${status}`);
  if (status === "FAIL") process.exit(1);
  if (status === "UNVERIFIED") process.exit(strict ? 1 : 0);
}

main();
