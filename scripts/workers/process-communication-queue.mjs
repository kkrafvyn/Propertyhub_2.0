#!/usr/bin/env node
// Processes queued communication work:
//  1. estate_automation_events (resident broadcasts + generic notification actions)
//  2. undelivered in-app notification_logs (marks them delivered)
// External channels (sms/email/whatsapp) stay queued until provider keys exist.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = { broadcasts: [], events: [], inAppFlushed: 0, externalPending: 0 };

async function getOrganizationResidentIds(organizationId) {
  const { data: estates } = await supabase
    .from('managed_estates')
    .select('id')
    .eq('organization_id', organizationId);
  const estateIds = (estates || []).map((e) => e.id);
  if (estateIds.length === 0) return [];

  const { data: units } = await supabase
    .from('estate_units')
    .select('id')
    .in('estate_id', estateIds);
  const unitIds = (units || []).map((u) => u.id);
  if (unitIds.length === 0) return [];

  const { data: occupancies } = await supabase
    .from('unit_occupancies')
    .select('user_id')
    .in('unit_id', unitIds)
    .is('end_date', null);

  return [...new Set((occupancies || []).map((o) => o.user_id))];
}

// 1) Resident broadcast events (other event types are handled by process-automation-events.mjs)
const { data: events, error: eventError } = await supabase
  .from('estate_automation_events')
  .select('*')
  .eq('status', 'pending')
  .eq('event_type', 'resident_broadcast')
  .lte('next_attempt_at', new Date().toISOString())
  .order('created_at', { ascending: true })
  .limit(25);

if (eventError) throw eventError;

for (const event of events || []) {
  await supabase
    .from('estate_automation_events')
    .update({ status: 'processing', attempt_count: (event.attempt_count || 0) + 1 })
    .eq('id', event.id);

  try {
    const message = event.payload?.message;
    if (!message) throw new Error('Broadcast event missing message payload');

    const residentIds = await getOrganizationResidentIds(event.organization_id);
    if (residentIds.length > 0) {
      const rows = residentIds.map((userId) => ({
        user_id: userId,
        notification_type: 'estate_broadcast',
        channel: 'in_app',
        subject: 'Estate announcement',
        content: message,
        delivered: true,
        delivered_at: new Date().toISOString(),
        read: false,
      }));
      const { error: insertError } = await supabase.from('notification_logs').insert(rows);
      if (insertError) throw insertError;
    }

    results.broadcasts.push({ eventId: event.id, recipients: residentIds.length });

    await supabase
      .from('estate_automation_events')
      .update({ status: 'completed', completed_at: new Date().toISOString(), last_error: null })
      .eq('id', event.id);
  } catch (error) {
    const attempts = (event.attempt_count || 0) + 1;
    await supabase
      .from('estate_automation_events')
      .update({
        status: attempts >= 5 ? 'failed' : 'pending',
        last_error: String(error.message || error),
        next_attempt_at: new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString(),
      })
      .eq('id', event.id);
    results.events.push({ eventId: event.id, status: 'error', reason: String(error.message || error) });
  }
}

// 2) Flush undelivered in-app notifications (in-app delivery is immediate)
const { data: undeliveredInApp } = await supabase
  .from('notification_logs')
  .select('id')
  .eq('channel', 'in_app')
  .eq('delivered', false)
  .limit(200);

if ((undeliveredInApp || []).length > 0) {
  const ids = undeliveredInApp.map((n) => n.id);
  const { error: flushError } = await supabase
    .from('notification_logs')
    .update({ delivered: true, delivered_at: new Date().toISOString() })
    .in('id', ids);
  if (!flushError) results.inAppFlushed = ids.length;
}

// 3) Report externally queued messages awaiting provider configuration
const { count: externalCount } = await supabase
  .from('notification_logs')
  .select('id', { count: 'exact', head: true })
  .in('channel', ['sms', 'email', 'whatsapp', 'push'])
  .eq('delivered', false);

results.externalPending = externalCount || 0;

console.log(JSON.stringify({ processedAt: new Date().toISOString(), ...results }, null, 2));
