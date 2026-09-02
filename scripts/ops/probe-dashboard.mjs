#!/usr/bin/env node
/**
 * Probe dashboard data sources for a user (service-role / postgres).
 * Usage: npm run ops:probe-dashboard -- kkrafvyn@gmail.com
 */
import pg from "pg";
import { loadProjectEnv } from "../load-project-env.mjs";

const email = (process.argv[2] || "kkrafvyn@gmail.com").trim().toLowerCase();

function getDbConfig(env) {
  if (env.SUPABASE_DB_URL) return { connectionString: env.SUPABASE_DB_URL };
  const password = env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in root .env");
  const ref = env.SUPABASE_PROJECT_REF || new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  const region = env.SUPABASE_DB_REGION || "eu-west-1";
  return {
    host: env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`,
    port: Number(env.SUPABASE_DB_PORT || 5432),
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

const PROBES = [
  { label: "public.users", sql: "SELECT id, email, is_platform_admin, banned FROM public.users WHERE lower(email) = lower($1)" },
  { label: "saved_properties", sql: "SELECT count(*)::int AS n FROM public.saved_properties WHERE user_id = $1" },
  { label: "deal_cases", sql: "SELECT count(*)::int AS n FROM public.deal_cases WHERE user_id = $1" },
  { label: "conversations", sql: "SELECT count(*)::int AS n FROM public.conversations WHERE participant_1_id = $1 OR participant_2_id = $1" },
  { label: "property_transactions", sql: "SELECT count(*)::int AS n FROM public.property_transactions WHERE user_id = $1" },
  { label: "property_viewings", sql: "SELECT count(*)::int AS n FROM public.property_viewings WHERE user_id = $1" },
  { label: "saved_search_alerts", sql: "SELECT count(*)::int AS n FROM public.saved_search_alerts WHERE user_id = $1" },
  { label: "user_wallets", sql: "SELECT count(*)::int AS n FROM public.user_wallets WHERE user_id = $1" },
  { label: "wallet_ledger", sql: "SELECT count(*)::int AS n FROM public.wallet_ledger wl JOIN public.user_wallets uw ON uw.id = wl.wallet_id WHERE uw.user_id = $1" },
  { label: "escrow_holds", sql: "SELECT count(*)::int AS n FROM public.escrow_holds WHERE tenant_user_id = $1 OR host_user_id = $1" },
  { label: "wallet_payout_requests", sql: "SELECT count(*)::int AS n FROM public.wallet_payout_requests WHERE user_id = $1" },
  { label: "leases", sql: "SELECT count(*)::int AS n FROM public.leases WHERE tenant_user_id = $1" },
  { label: "bookings", sql: "SELECT count(*)::int AS n FROM public.bookings WHERE guest_user_id = $1" },
  { label: "maintenance_requests", sql: "SELECT count(*)::int AS n FROM public.maintenance_requests WHERE tenant_user_id = $1" },
  { label: "saved_payment_methods", sql: "SELECT count(*)::int AS n FROM public.saved_payment_methods WHERE user_id = $1" },
  { label: "mortgage_inquiries", sql: "SELECT count(*)::int AS n FROM public.mortgage_inquiries WHERE user_id = $1" },
  { label: "notification_history", sql: "SELECT count(*)::int AS n FROM public.notification_history WHERE user_id = $1" },
  { label: "resident_profiles", sql: "SELECT count(*)::int AS n FROM public.resident_profiles WHERE user_id = $1" },
];

async function main() {
  const env = loadProjectEnv();
  const client = new pg.Client(getDbConfig(env));
  await client.connect();

  try {
    const { rows: users } = await client.query(
      "SELECT id, email, is_platform_admin, banned, verified FROM public.users WHERE lower(email) = lower($1)",
      [email],
    );
    const user = users[0];
    if (!user) {
      console.error(`No public.users row for ${email}`);
      process.exit(1);
    }

    console.log("User:", user);

    for (const probe of PROBES) {
      try {
        const args = probe.label === "public.users" ? [email] : [user.id];
        const { rows } = await client.query(probe.sql, args);
        console.log(`OK  ${probe.label}`, rows[0]);
      } catch (error) {
        console.log(`FAIL ${probe.label}`, error instanceof Error ? error.message : error);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
