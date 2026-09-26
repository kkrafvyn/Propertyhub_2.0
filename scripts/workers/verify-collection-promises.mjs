#!/usr/bin/env node
import pg from "pg";
if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required to verify collection promises.");
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: process.env.DB_ALLOW_INSECURE_TLS !== "1" } });
await client.connect();
try { const { rows } = await client.query("select public.verify_due_collection_promises(current_date) as verified_count"); console.log(JSON.stringify({ verifiedCount: Number(rows[0].verified_count) })); } finally { await client.end(); }
