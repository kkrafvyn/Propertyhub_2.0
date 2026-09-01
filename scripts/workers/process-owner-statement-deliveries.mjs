#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: deliveries, error } = await supabase
  .from('estate_owner_statement_deliveries')
  .select('id, channel, statement_run_id, statement:estate_owner_statement_runs(owner_user_id, period_start, period_end, net_distributable_minor, currency, estate:managed_estates(name))')
  .eq('status', 'queued')
  .order('queued_at', { ascending: true })
  .limit(50);

if (error) throw error;

const results = [];

for (const delivery of deliveries || []) {
  if (delivery.channel !== 'in_app') {
    results.push({ deliveryId: delivery.id, channel: delivery.channel, status: 'skipped', reason: 'external channel requires provider config' });
    continue;
  }

  const statement = delivery.statement as any;
  if (!statement?.owner_user_id) {
    await supabase
      .from('estate_owner_statement_deliveries')
      .update({ status: 'failed', error_message: 'Missing owner on statement run' })
      .eq('id', delivery.id);
    results.push({ deliveryId: delivery.id, status: 'failed', reason: 'missing owner' });
    continue;
  }

  const estateName = statement.estate?.name || 'Property';
  const amount = ((Number(statement.net_distributable_minor) || 0) / 100).toFixed(2);
  const currency = statement.currency || 'GHS';

  const { error: notifyError } = await supabase.from('notification_logs').insert({
    user_id: statement.owner_user_id,
    notification_type: 'owner_statement',
    subject: `Owner statement ready — ${estateName}`,
    content: `Your statement for ${statement.period_start} to ${statement.period_end} is ready. Net distributable: ${currency} ${amount}.`,
    action_url: '/app/documents',
    metadata: { statementRunId: delivery.statement_run_id, deliveryId: delivery.id },
    channel: 'in_app',
    delivered: true,
    delivered_at: new Date().toISOString(),
    read: false,
  });

  if (notifyError) {
    await supabase
      .from('estate_owner_statement_deliveries')
      .update({ status: 'failed', error_message: notifyError.message })
      .eq('id', delivery.id);
    results.push({ deliveryId: delivery.id, status: 'failed', reason: notifyError.message });
    continue;
  }

  await supabase
    .from('estate_owner_statement_deliveries')
    .update({
      status: 'delivered',
      provider_reference: `in_app:${delivery.id.slice(0, 8)}`,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', delivery.id);

  await supabase
    .from('estate_owner_statement_runs')
    .update({ status: 'delivered' })
    .eq('id', delivery.statement_run_id);

  results.push({ deliveryId: delivery.id, status: 'delivered' });
}

console.log(JSON.stringify({ processedAt: new Date().toISOString(), count: results.length, results }, null, 2));
