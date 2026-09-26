#!/usr/bin/env node
// Operational health check — verifies the live Supabase project is reachable
// and reports queue backlogs so a scheduler/monitor can alert on regressions.
// Exit code 1 = unhealthy (unreachable or a queue is stuck).
import "../lib/ensure-node-websocket.mjs";
import { createClient } from '@supabase/supabase-js';
import { assessBackupEvidence } from '../backup/lib/backup-evidence.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  const optional = process.env.HEALTH_CHECK_SKIP_IF_UNCONFIGURED === 'true';
  const summary = {
    checkedAt: new Date().toISOString(),
    healthy: false,
    skipped: true,
    reason: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
    checks: [],
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(optional ? 0 : 1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];
let healthy = true;

if (process.env.HEALTH_CHECK_REQUIRE_ALERTS === 'true' && !process.env.OPS_ALERT_WEBHOOK_URL?.trim()) {
  healthy = false;
  checks.push({ name: 'alert delivery configuration', level: 'fail', error: 'OPS_ALERT_WEBHOOK_URL is required for monitored environments' });
}

async function countRows(name, table, applyFilters, { warnAt = 50, failAt = 500 } = {}) {
  try {
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (applyFilters) query = applyFilters(query);
    const { count, error } = await query.abortSignal(AbortSignal.timeout(10000));
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
  const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true }).abortSignal(AbortSignal.timeout(10000));
  if (error) throw error;
  checks.push({ name: 'supabase connectivity', level: 'ok' });
} catch (error) {
  healthy = false;
  checks.push({ name: 'supabase connectivity', level: 'fail', error: String(error.message || error) });
}

const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

for (const [name, url, contentType] of [
  ['web application', process.env.APP_HEALTH_URL, 'text/html'],
  ['authentication API', `${supabaseUrl}/auth/v1/health`, 'json'],
]) {
  if (!url) { healthy = false; checks.push({ name, level: 'fail', error: 'Probe URL not configured' }); continue; }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok || !response.headers.get('content-type')?.includes(contentType)) throw new Error(`Unexpected HTTP ${response.status}`);
    await response.body?.cancel(); checks.push({ name, level: 'ok' });
  } catch { healthy = false; checks.push({ name, level: 'fail', error: 'Endpoint unavailable or returned an unexpected response' }); }
}

const { data: backup, error: backupError } = await supabase.from('operational_events').select('metadata')
  .eq('service', 'offsite-backup').eq('event_type', 'backup_result').order('created_at', { ascending: false }).limit(1).maybeSingle();
const backupState = assessBackupEvidence(backup?.metadata, { requireRestore: false });
checks.push({ name: 'fresh offsite backup', level: backupError || !backupState.ok ? 'fail' : 'ok', detail: backupState.reason });
if (backupError || !backupState.ok) healthy = false;

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

const { data: previous } = await supabase.from('operational_events').select('metadata')
  .eq('service', 'scheduled-health').eq('event_type', 'health_snapshot').order('created_at', { ascending: false }).limit(1).maybeSingle();
const { error: recordError } = await supabase.from('operational_events').insert({
  service: 'scheduled-health', event_type: 'health_snapshot', severity: healthy ? 'info' : 'error',
  message: healthy ? 'Scheduled health checks passed' : 'Scheduled health checks failed', metadata: summary,
});
if (recordError) { healthy = false; summary.healthy = false; checks.push({ name:'telemetry persistence', level:'fail' }); }

console.log(JSON.stringify(summary, null, 2));

const alertWebhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim();
const recovered = healthy && previous?.metadata?.healthy === false;
if ((!healthy || recovered) && alertWebhook) {
  try {
    const response = await fetch(alertWebhook, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `BaytMiftah health check ${recovered ? 'RECOVERED' : 'FAILED'} at ${summary.checkedAt}`,
        healthy,
        checks: checks.filter((c) => c.level === 'fail'),
      }),
    });
    if (!response.ok) throw new Error(`Alert endpoint HTTP ${response.status}`);
  } catch (alertError) {
    console.error('Alert webhook delivery failed');
    healthy = false;
  }
}

process.exit(healthy ? 0 : 1);
