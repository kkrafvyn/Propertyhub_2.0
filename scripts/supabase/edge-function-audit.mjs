#!/usr/bin/env node
/**
 * Compare repo edge functions vs optional remote snapshot (.cursor-fn-list.json)
 * or `supabase functions list` when SUPABASE_ACCESS_TOKEN is set.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { loadProjectEnv, getProjectRef } from "../load-project-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const functionsDir = path.join(root, "supabase/functions");

function listLocalSlugs() {
  if (!existsSync(functionsDir)) return [];
  return readdirSync(functionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

function listRemoteFromSnapshot() {
  const snapshotPath = path.join(root, ".cursor-fn-list.json");
  if (!existsSync(snapshotPath)) return null;
  const raw = readFileSync(snapshotPath, "utf8").replace(/^\uFEFF/, "");
  const rows = JSON.parse(raw);
  return [...new Set(rows.map((r) => r.slug || r.name).filter(Boolean))].sort();
}

function listRemoteFromCli(projectRef, token) {
  if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) return null;
  const cliEnv = token?.trim()
    ? { ...process.env, SUPABASE_ACCESS_TOKEN: token }
    : process.env;
  try {
    const executable = process.platform === "win32" ? "npx.cmd" : "npx";
    const out = execFileSync(executable, ["supabase", "functions", "list", "--project-ref", projectRef], {
      cwd: root,
      encoding: "utf8",
      env: cliEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const trimmed = out.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      const rows = parsed.functions || parsed;
      if (Array.isArray(rows)) {
        const slugs = rows.map((r) => (r.slug || r.name || "").toLowerCase()).filter(Boolean);
        return slugs.length ? [...new Set(slugs)].sort() : null;
      }
    }
    const slugs = [];
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^\s*([a-z0-9-]+)\s/i);
      if (m && !["NAME", "ID", "SLUG"].includes(m[1].toUpperCase())) slugs.push(m[1].toLowerCase());
    }
    return slugs.length ? [...new Set(slugs)].sort() : null;
  } catch {
    return null;
  }
}

const local = listLocalSlugs();
const env = loadProjectEnv();
const projectRef = getProjectRef(env) || "ixmbfnfwpjwbfahqaftc";
let remote = listRemoteFromCli(projectRef, env.SUPABASE_ACCESS_TOKEN);
let remoteSource = remote ? "supabase-cli" : null;
if (!remote) {
  remote = listRemoteFromCli(projectRef, null);
  remoteSource = remote ? "supabase-cli (logged-in)" : remoteSource;
}
if (!remote) {
  remote = listRemoteFromSnapshot();
  remoteSource = remote ? ".cursor-fn-list.json snapshot" : null;
}

const missingOnRemote = remote ? local.filter((s) => !remote.includes(s)) : [];
const legacyOnRemote = remote ? remote.filter((s) => !local.includes(s)) : [];

const report = {
  checkedAt: new Date().toISOString(),
  projectRef,
  localCount: local.length,
  remoteCount: remote?.length ?? null,
  remoteSource,
  local,
  missingOnRemote,
  legacyOnRemote,
  deployMissing: missingOnRemote.map(
    (slug) => `npx supabase functions deploy ${slug} --project-ref ${projectRef}`,
  ),
  deleteLegacyHint:
    legacyOnRemote.length > 0
      ? `Review ${legacyOnRemote.length} remote-only functions; delete with node scripts/supabase/delete-legacy-remote-functions.mjs`
      : remote
        ? "Remote inventory matches local slugs (no legacy remote-only functions)."
        : "No remote list — log in via supabase CLI or set SUPABASE_ACCESS_TOKEN, then re-run audit.",
};

console.log(JSON.stringify(report, null, 2));
if (missingOnRemote.includes("polygon-transactions")) {
  console.error("\nAction: deploy polygon-transactions (blockchain receipts depend on it).");
}
process.exit(0);
