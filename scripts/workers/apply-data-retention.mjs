#!/usr/bin/env node
// Purges aged operational rows according to data_retention_policies, skipping
// entities (or entity ids) currently on an unreleased legal hold.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE_MAP = {
  notification_logs: { table: 'notification_logs', dateColumn: 'created_at', orgColumn: null },
  estate_automation_events: { table: 'estate_automation_events', dateColumn: 'created_at', orgColumn: 'organization_id' },
  estate_ai_action_logs: { table: 'estate_ai_action_logs', dateColumn: 'created_at', orgColumn: 'organization_id' },
  platform_activity: { table: 'platform_activity', dateColumn: 'created_at', orgColumn: 'organization_id' },
};

const { data: policies, error } = await supabase.from('data_retention_policies').select('*');
if (error) throw error;

const { data: holds, error: holdsError } = await supabase.from('legal_holds').select('*').is('released_at', null);
if (holdsError) throw new Error('Retention stopped because legal holds could not be verified');
const held = new Set((holds || []).map((h) => `${h.organization_id}:${h.entity}`));

const results = [];

for (const policy of policies || []) {
  if (!Number.isInteger(policy.retention_days) || policy.retention_days < 1) throw new Error('Invalid retention period');
  const mapping = TABLE_MAP[policy.entity];
  if (!mapping) {
    results.push({ entity: policy.entity, status: 'skipped', reason: 'no purge mapping' });
    continue;
  }
  if (held.has(`${policy.organization_id}:${policy.entity}`)) {
    results.push({ entity: policy.entity, organizationId: policy.organization_id, status: 'held' });
    continue;
  }

  const cutoff = new Date(Date.now() - policy.retention_days * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from(mapping.table).delete().lt(mapping.dateColumn, cutoff);
  if (mapping.orgColumn) query = query.eq(mapping.orgColumn, policy.organization_id);
  const { error: deleteError, count } = await query.select('id', { count: 'exact', head: true });
  if (deleteError) {
    results.push({ entity: policy.entity, status: 'error', reason: deleteError.message });
  } else {
    results.push({ entity: policy.entity, organizationId: policy.organization_id, status: 'purged', cutoff });
  }
  void count;
}

console.log(JSON.stringify({ processedAt: new Date().toISOString(), results }, null, 2));
