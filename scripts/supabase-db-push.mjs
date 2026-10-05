import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (!m) continue;
  env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

const ref = env.SUPABASE_PROJECT_REF || "ixmbfnfwpjwbfahqaftc";
const pass = env.SUPABASE_DB_PASSWORD;
const region = env.SUPABASE_DB_REGION || "eu-west-1";
if (!pass) {
  console.error("SUPABASE_DB_PASSWORD missing in .env");
  process.exit(1);
}

const enc = encodeURIComponent(pass);
const urls = [
  `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
];

for (const url of urls) {
  const host = new URL(url).host;
  console.log(`Pushing migrations via ${host}…`);
  const r = spawnSync("npx", ["supabase", "db", "push", "--db-url", url, "--yes"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status === 0) {
    console.log("Migrations applied successfully.");
    process.exit(0);
  }
}

console.error("All connection attempts failed.");
process.exit(1);
