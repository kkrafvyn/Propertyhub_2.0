import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function dbUrl(env) {
  const ref = env.SUPABASE_PROJECT_REF || "ixmbfnfwpjwbfahqaftc";
  const pass = env.SUPABASE_DB_PASSWORD;
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  if (!pass) throw new Error("SUPABASE_DB_PASSWORD missing");
  const enc = encodeURIComponent(pass);
  return [
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
  ];
}

function localVersions() {
  return new Set(
    fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.replace(/\.sql$/, "")),
  );
}

function run(args, env) {
  const r = spawnSync("npx", ["supabase", ...args], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  return r.status ?? 1;
}

const env = loadEnv();
const local = localVersions();
let url = null;

for (const candidate of dbUrl(env)) {
  console.log("Listing migrations via", new URL(candidate).host);
  const list = spawnSync(
    "npx",
    ["supabase", "migration", "list", "--db-url", candidate],
    { cwd: root, encoding: "utf8", shell: true, env: { ...process.env, ...env } },
  );
  if (list.status === 0) {
    url = candidate;
    const remoteOnly = [];
    for (const line of (list.stdout || "").split(/\r?\n/)) {
      const m = line.match(/^\s*(\S+)\s+\|\s+(\S+)/);
      if (!m) continue;
      const version = m[1];
      if (version === "Local" || version === "Remote") continue;
      if (!local.has(version)) remoteOnly.push(version);
    }
    if (remoteOnly.length) {
      console.log("\nRemote versions missing locally (" + remoteOnly.length + "):");
      for (const v of remoteOnly) console.log("  ", v);
      console.log("\nRepairing as reverted (remote-only ghosts)…");
      for (const v of remoteOnly) {
        const code = run(["migration", "repair", "--status", "reverted", v, "--db-url", url], env);
        if (code !== 0) process.exit(code);
      }
    } else {
      console.log("All remote migration versions exist locally.");
    }
    break;
  }
}

if (!url) {
  console.error("Could not connect to list migrations.");
  process.exit(1);
}

console.log("\nPushing pending migrations…");
const push = run(["db", "push", "--db-url", url, "--yes"], env);
process.exit(push);
