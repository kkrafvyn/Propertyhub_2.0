import pg from "pg";
import { loadProjectEnv } from "../load-project-env.mjs";

const env = loadProjectEnv();
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const client = new pg.Client({
  host: env.SUPABASE_DB_HOST || "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  user: `postgres.${ref}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = [
  "transaction_receipts",
  "property_refunds",
  "blockchain_records",
  "notification_logs",
  "resident_home_profiles",
  "mortgage_insurance_inquiries",
  "short_stay_bookings",
];
for (const table of tables) {
  const { rows } = await client.query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${table}`]);
  console.log(table, rows[0].ok);
}
await client.end();
