import fs from "fs";
import path from "path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

const ref = env.SUPABASE_PROJECT_REF || "ixmbfnfwpjwbfahqaftc";
const pass = env.SUPABASE_DB_PASSWORD;
const region = env.SUPABASE_DB_REGION || "eu-west-1";
const enc = encodeURIComponent(pass);
const url = `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const count = await client.query("select count(*)::int as c from supabase_migrations.schema_migrations");
const last = await client.query(
  "select version from supabase_migrations.schema_migrations order by version desc limit 15",
);
const first = await client.query(
  "select version from supabase_migrations.schema_migrations order by version asc limit 5",
);
console.log(JSON.stringify({ count: count.rows[0].c, first: first.rows, last: last.rows }, null, 2));
await client.end();
