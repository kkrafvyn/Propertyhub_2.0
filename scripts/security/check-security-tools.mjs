#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSecurityTool } from "./lib/resolve-tool.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE = path.join(ROOT, ".cache", "security-tools");

function check(name, resolved, versionArgs = ["--version"]) {
  if (!resolved) {
    console.log(`${name.padEnd(10)} MISSING  run: npm run security:install-tools`);
    return false;
  }
  // nosemgrep: detect-child-process - resolved commands come only from the scanner resolver.
  const result = spawnSync(resolved.command, [...resolved.prefixArgs, ...versionArgs], {
    encoding: "utf8",
    cwd: ROOT,
    env: resolved.via === "pip"
      ? { ...process.env, PATH: `${path.dirname(resolved.command)};${process.env.PATH || ""}` }
      : process.env,
  });
  const version = (result.stdout || result.stderr || "").trim().split("\n")[0];
  console.log(`${name.padEnd(10)} OK       ${version || resolved.command} (${resolved.via})`);
  return result.status === 0 || Boolean(version);
}

console.log("\nSecurity tool status\n");
console.log(`Cache: ${CACHE}\n`);

const gitleaks = resolveSecurityTool("gitleaks");
const semgrep = resolveSecurityTool("semgrep");
const trivy = resolveSecurityTool("trivy");

check("Gitleaks", gitleaks);
check("Semgrep", semgrep, ["--version"]);
check("Trivy", trivy, ["--version"]);

if (!existsSync(CACHE)) {
  console.log("\nNo cached tools yet. Run: npm run security:install-tools\n");
}

console.log("");
