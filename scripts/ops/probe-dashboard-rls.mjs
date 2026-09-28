import pg from "pg";
import { loadProjectEnv } from "../load-project-env.mjs";

const email = (process.argv[2] || "kkrafvyn@gmail.com").trim().toLowerCase();
const env = loadProjectEnv();
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];

const client = new pg.Client({
  host: env.SUPABASE_DB_HOST || "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  user: `postgres.${ref}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: true },
});

async function asUser(userId, sql, params = []) {
  await client.query("BEGIN");
  try {
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
    await client.query("SET LOCAL ROLE authenticated");
    const result = await client.query(sql, params);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

await client.connect();
const { rows: users } = await client.query(
  "SELECT id FROM public.users WHERE lower(email) = lower($1)",
  [email],
);
const userId = users[0]?.id;
if (!userId) throw new Error(`No user for ${email}`);

const probes = [
  ["saved_properties", "SELECT count(*)::int AS n FROM public.saved_properties WHERE user_id = $1", [userId]],
  ["deal_cases", "SELECT count(*)::int AS n FROM public.deal_cases WHERE user_id = $1", [userId]],
  ["conversations", "SELECT count(*)::int AS n FROM public.conversations WHERE participant_1_id = $1 OR participant_2_id = $1", [userId]],
  ["property_transactions", "SELECT count(*)::int AS n FROM public.property_transactions WHERE payer_user_id = $1", [userId]],
  ["property_viewings", "SELECT count(*)::int AS n FROM public.property_viewings WHERE user_id = $1", [userId]],
  ["saved_search_alerts", "SELECT count(*)::int AS n FROM public.saved_search_alerts WHERE user_id = $1", [userId]],
  ["user_wallets", "SELECT count(*)::int AS n FROM public.user_wallets WHERE user_id = $1", [userId]],
  ["escrow_holds", "SELECT count(*)::int AS n FROM public.escrow_holds WHERE payer_user_id = $1", [userId]],
  ["wallet_payout_requests", "SELECT count(*)::int AS n FROM public.wallet_payout_requests WHERE user_id = $1", [userId]],
  ["leases", "SELECT count(*)::int AS n FROM public.leases WHERE tenant_user_id = $1", [userId]],
  ["short_stay_bookings", "SELECT count(*)::int AS n FROM public.short_stay_bookings WHERE guest_user_id = $1", [userId]],
  ["maintenance_requests", "SELECT count(*)::int AS n FROM public.maintenance_requests WHERE tenant_user_id = $1", [userId]],
  ["notification_logs", "SELECT count(*)::int AS n FROM public.notification_logs WHERE user_id = $1", [userId]],
  ["resident_home_profiles", "SELECT count(*)::int AS n FROM public.resident_home_profiles WHERE tenant_user_id = $1", [userId]],
  ["mortgage_insurance_inquiries", "SELECT count(*)::int AS n FROM public.mortgage_insurance_inquiries WHERE user_id = $1", [userId]],
  ["saved_payment_methods", "SELECT count(*)::int AS n FROM public.saved_payment_methods WHERE user_id = $1", [userId]],
];

const embedProbes = [
  [
    "messages embed",
    `SELECT c.id
     FROM public.conversations c
     LEFT JOIN public.messages m ON m.conversation_id = c.id
     WHERE c.participant_1_id = $1 OR c.participant_2_id = $1
     LIMIT 1`,
    [userId],
  ],
  [
    "property_transactions heavy",
    `SELECT pt.id
     FROM public.property_transactions pt
     WHERE pt.payer_user_id = $1
     LIMIT 1`,
    [userId],
  ],
  [
    "escrow embed transaction",
    `SELECT eh.id
     FROM public.escrow_holds eh
     WHERE eh.payer_user_id = $1
     LIMIT 1`,
    [userId],
  ],
];

for (const [label, sql, params] of probes) {
  try {
    const { rows } = await asUser(userId, sql, params);
    console.log("OK ", label, rows[0]);
  } catch (error) {
    console.log("FAIL", label, error instanceof Error ? error.message : error);
  }
}

for (const [label, sql, params] of embedProbes) {
  try {
    const { rows } = await asUser(userId, sql, params);
    console.log("OK ", label, rows[0]);
  } catch (error) {
    console.log("FAIL", label, error instanceof Error ? error.message : error);
  }
}

await client.end();
