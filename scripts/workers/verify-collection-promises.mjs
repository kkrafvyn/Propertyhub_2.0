#!/usr/bin/env node
import pg from "pg";
import { verifiedDatabaseUrl } from "../secure-db-url.mjs";
if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required to verify collection promises.");
const client = new pg.Client({ connectionString: verifiedDatabaseUrl(process.env.SUPABASE_DB_URL), ssl: { rejectUnauthorized: true } });
await client.connect();
try { const { rows } = await client.query("select public.verify_due_collection_promises(current_date) as verified_count"); console.log(JSON.stringify({ verifiedCount: Number(rows[0].verified_count) })); } finally { await client.end(); }
