#!/usr/bin/env node
// Operational health check — verifies the live Supabase project is reachable
// and reports queue backlogs so a scheduler/monitor can alert on regressions.
// Exit code 1 = unhealthy (unreachable or a queue is stuck).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];
let healthy = true;

async function countRows(name, table, applyFilters, { warnAt = 50, failAt = 500 } = {}) {
  try {
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (applyFilters) query = applyFilters(query);
    const { count, error } = await query;
    if (error) throw error;

    const level = (count || 0) >= failAt ? 'fail' : (count || 0) >= warnAt ? 'warn' : 'ok';
    if (level === 'fail') healthy = false;
    checks.push({ name, count: count || 0, level });
  } catch (error) {
    healthy = false;
    checks.push({ name, level: 'fail', error: String(error.message || error) });
  }
}

// Connectivity: a trivial select proves auth + reachability.
try {
  const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
  if (error) throw error;
  checks.push({ name: 'supabase connectivity', level: 'ok' });
} catch (error) {
  healthy = false;
  checks.push({ name: 'supabase connectivity', level: 'fail', error: String(error.message || error) });
}

const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

await countRows('automation events: failed', 'estate_automation_events', (q) => q.eq('status', 'failed'), {
  warnAt: 1,
  failAt: 25,
});
await countRows(
  'automation events: stale pending (>24h)',
  'estate_automation_events',
  (q) => q.eq('status', 'pending').lt('created_at', oneDayAgo),
  { warnAt: 1, failAt: 100 }
);
await countRows(
  'owner statement deliveries: stuck in queue (>24h)',
  'estate_owner_statement_deliveries',
  (q) => q.eq('status', 'queued').lt('queued_at', oneDayAgo),
  { warnAt: 1, failAt: 100 }
);
await countRows(
  'notifications: undelivered in-app (>24h)',
  'notification_logs',
  (q) => q.eq('channel', 'in_app').eq('delivered', false).lt('created_at', oneDayAgo),
  { warnAt: 10, failAt: 500 }
);
await countRows(
  'collections: overdue promises unverified',
  'estate_promise_to_pay',
  (q) => q.eq('status', 'active').lt('promised_for', new Date().toISOString().slice(0, 10)),
  { warnAt: 5, failAt: 100 }
);

const summary = {
  checkedAt: new Date().toISOString(),
  healthy,
  checks,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(healthy ? 0 : 1);
