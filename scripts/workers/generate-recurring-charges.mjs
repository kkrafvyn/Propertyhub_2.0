#!/usr/bin/env node
// Run once per day from a secured scheduler using SUPABASE_DB_URL. This process
// is intentionally database-only; it never contains payment or user secrets.
import pg from "pg";
import { verifiedDatabaseUrl } from "../secure-db-url.mjs";

if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required to run recurring charges.");
const client = new pg.Client({ connectionString: verifiedDatabaseUrl(process.env.SUPABASE_DB_URL), ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  const { rows } = await client.query("select public.run_due_estate_charge_schedules(current_date) as generated_count");
  console.log(JSON.stringify({ generatedCount: Number(rows[0].generated_count), date: new Date().toISOString().slice(0, 10) }));
} finally { await client.end(); }
