#!/usr/bin/env node
/**
 * Delete remote edge functions that are not in supabase/functions (legacy monolith / old payment rails).
 * Usage: node scripts/supabase/delete-legacy-remote-functions.mjs [--dry-run]
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProjectRef, loadProjectEnv } from "../load-project-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dryRun = process.argv.includes("--dry-run");
const env = loadProjectEnv();
const projectRef = getProjectRef(env) || "ixmbfnfwpjwbfahqaftc";
const logPath = path.join(root, "docs/deployment/edge-legacy-deletions.log");

function listLocal() {
  const dir = path.join(root, "supabase/functions");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

function listRemote() {
  const out = execSync(`npx supabase functions list --project-ref ${projectRef}`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(out.trim());
  return (parsed.functions || []).map((f) => f.slug).filter(Boolean);
}

const local = new Set(listLocal());
const legacy = listRemote().filter((s) => !local.has(s)).sort();

writeFileSync(
  logPath,
  `# Legacy edge function deletions — ${new Date().toISOString()}\nprojectRef: ${projectRef}\ndryRun: ${dryRun}\n\n`,
);

const deleted = [];
const failed = [];

for (const slug of legacy) {
  const line = `${slug}: `;
  if (dryRun) {
    appendFileSync(logPath, `${line}skipped (dry-run)\n`);
    continue;
  }
  try {
    execSync(`npx supabase functions delete ${slug} --project-ref ${projectRef}`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    deleted.push(slug);
    appendFileSync(logPath, `${line}deleted\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/FunctionNotFoundError|nothing to delete/i.test(msg)) {
      deleted.push(slug);
      appendFileSync(logPath, `${line}already absent\n`);
    } else {
      failed.push(slug);
      appendFileSync(logPath, `${line}failed\n`);
    }
  }
}

console.log(
  JSON.stringify(
    { projectRef, dryRun, legacyCount: legacy.length, deleted: deleted.length, failed: failed.length, deletedSlugs: deleted, failedSlugs: failed },
    null,
    2,
  ),
);
