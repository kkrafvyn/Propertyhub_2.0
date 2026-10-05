/**
 * Apply pending SQL migrations when CLI history uses full version names.
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function poolerUrl(env) {
  const ref = env.SUPABASE_PROJECT_REF || "ixmbfnfwpjwbfahqaftc";
  const pass = env.SUPABASE_DB_PASSWORD;
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  if (!pass) throw new Error("SUPABASE_DB_PASSWORD missing in .env");
  return `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
}

function localVersions() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, ""))
    .sort();
}

const RENAME_MAP = {
  "010_paystack_property_payments": "010_payangels_property_payments",
  "20260513114618_paystack_property_refunds": "20260513114618_payangels_property_refunds",
};

const MARK_APPLIED_WITHOUT_RUN = ["001_create_schema_simple"];

const env = loadEnv();
const client = new pg.Client({ connectionString: poolerUrl(env), ssl: { rejectUnauthorized: false } });
await client.connect();

for (const [from, to] of Object.entries(RENAME_MAP)) {
  await client.query("update supabase_migrations.schema_migrations set version = $2 where version = $1", [from, to]);
}

for (const version of MARK_APPLIED_WITHOUT_RUN) {
  const exists = await client.query("select 1 from supabase_migrations.schema_migrations where version = $1", [version]);
  if (exists.rowCount === 0) {
    await client.query("insert into supabase_migrations.schema_migrations (version) values ($1)", [version]);
  }
}

const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
const remote = new Set(rows.map((r) => r.version));
const pending = localVersions().filter((v) => !remote.has(v));

console.log("Applying", pending.length, "migration(s)…");

for (const version of pending) {
  const filePath = path.join(migrationsDir, `${version}.sql`);
  const sql = fs.readFileSync(filePath, "utf8");
  console.log("→", version);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into supabase_migrations.schema_migrations (version) values ($1)", [version]);
    await client.query("commit");
    console.log("  applied");
  } catch (err) {
    await client.query("rollback");
    console.error("  failed:", err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("All pending migrations applied.");
