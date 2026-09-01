#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for night-watch-audit worker');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const asOfDate = process.env.NIGHT_WATCH_AS_OF_DATE || new Date().toISOString().slice(0, 10);

const { data: orgs, error: orgError } = await supabase
  .from('organizations')
  .select('id, name')
  .limit(25);

if (orgError) throw orgError;

const summary = [];

for (const org of orgs || []) {
  const { data: estates } = await supabase
    .from('managed_estates')
    .select('id')
    .eq('organization_id', org.id);
  const estateIds = (estates || []).map((e) => e.id);
  if (estateIds.length === 0) {
    summary.push({ organizationId: org.id, organizationName: org.name, alerts: 0, skipped: true });
    continue;
  }

  const [{ data: openCases }, { data: overdueCharges }, { data: urgentIssues }] = await Promise.all([
    supabase
      .from('estate_collection_cases')
      .select('id')
      .in('estate_id', estateIds)
      .not('status', 'in', '("resolved","closed")'),
    supabase.from('estate_charges').select('id').eq('status', 'overdue').limit(100),
    supabase
      .from('estate_issues')
      .select('id, title')
      .in('estate_id', estateIds)
      .eq('priority', 'urgent')
      .not('status', 'in', '("resolved","closed")'),
  ]);

  const alerts = (openCases?.length || 0) + (overdueCharges?.length || 0) + (urgentIssues?.length || 0);

  if (alerts > 0) {
    await supabase.from('estate_ai_action_logs').insert({
      organization_id: org.id,
      agent_type: 'operations',
      risk_level: urgentIssues?.length ? 'high' : 'medium',
      trigger_type: 'night_watch_worker',
      recommendation: `Night watch ${asOfDate}: ${openCases?.length || 0} collection case(s), ${overdueCharges?.length || 0} overdue charge(s), ${urgentIssues?.length || 0} urgent issue(s).`,
      action_status: 'recommended',
    });
  }

  summary.push({
    organizationId: org.id,
    organizationName: org.name,
    openCases: openCases?.length || 0,
    overdueCharges: overdueCharges?.length || 0,
    urgentIssues: urgentIssues?.length || 0,
    alerts,
  });
}

console.log(JSON.stringify({ asOfDate, organizationsScanned: summary.length, summary }, null, 2));
