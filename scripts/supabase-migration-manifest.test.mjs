import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

if (!env.SUPABASE_DB_PASSWORD) {
  console.log("skip migration manifest test (no SUPABASE_DB_PASSWORD)");
  process.exit(0);
}

const ref = env.SUPABASE_PROJECT_REF || "ixmbfnfwpjwbfahqaftc";
const enc = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
const region = env.SUPABASE_DB_REGION || "eu-west-1";
const url = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`;

const local = new Set(
  fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, "")),
);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
await client.end();

const remote = rows.map((r) => r.version);
const remoteOnly = remote.filter((v) => !local.has(v));
const pending = [...local].filter((v) => !remote.includes(v));

assert.equal(pending.length, 0, `pending local migrations: ${pending.join(", ")}`);
assert.equal(remoteOnly.length, 0, `remote-only versions: ${remoteOnly.join(", ")}`);
console.log(`migration manifest ok (${remote.length} remote, ${local.size} local files)`);
