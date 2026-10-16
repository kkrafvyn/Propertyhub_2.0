import pg from "pg";
import { getDbConfig } from "./backup/lib/db-config.mjs";

const client = new pg.Client(getDbConfig());
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
