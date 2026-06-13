/** Per-user demo seeding — runs once when a user first opens a workspace */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function ensureAgentData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('agent_leads').select('id').eq('agent_id', userId).limit(1)
  if (data?.length) return

  await admin.from('agent_leads').insert([
    { id: 'al1', agent_id: userId, name: 'Daniel K.', property: 'Cantonments Sky Villa', stage: 'viewing', value: 125000, updated_label: '2h ago' },
    { id: 'al2', agent_id: userId, name: 'Sarah A.', property: 'Labone Penthouse', stage: 'offer', value: 4200000, updated_label: '5h ago' },
    { id: 'al3', agent_id: userId, name: 'Michael T.', property: 'East Legon Family Home', stage: 'contacted', value: 58000, updated_label: '1d ago' },
  ])
  await admin.from('agent_calendar').insert([
    { id: 'c1', agent_id: userId, title: 'Viewing — Cantonments Sky Villa', event_date: '2026-06-14', event_time: '10:00', event_type: 'viewing' },
    { id: 'c2', agent_id: userId, title: 'Call — Sarah A.', event_date: '2026-06-14', event_time: '14:30', event_type: 'call' },
  ])
  await admin.from('agent_tasks').insert([
    { id: 't1', agent_id: userId, title: 'Send ownership docs to Sarah A.', due_date: '2026-06-13', priority: 'high', done: false },
    { id: 't2', agent_id: userId, title: 'Update Labone Penthouse photos', due_date: '2026-06-14', priority: 'medium', done: false },
  ])
}

export async function ensureRenterData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('leases').select('id').eq('user_id', userId).limit(1)
  if (data?.length) return

  await admin.from('leases').insert([
    { id: 'lease-1', user_id: userId, property: 'Cantonments Sky Villa — Unit 4B', landlord: 'Gold Coast Realty', start_date: '2025-09-01', end_date: '2026-08-31', rent: 125000, status: 'active', signed: true },
  ])
  await admin.from('rent_payments').insert([
    { id: 'rp1', user_id: userId, lease_id: 'lease-1', period: 'June 2026', amount: 125000, due_date: '2026-06-01', status: 'due' },
    { id: 'rp2', user_id: userId, lease_id: 'lease-1', period: 'May 2026', amount: 125000, due_date: '2026-05-01', status: 'paid', method: 'Mobile money' },
  ])
  await admin.from('maintenance_requests').insert([
    { id: 'mr1', user_id: userId, title: 'AC not cooling in master bedroom', category: 'HVAC', priority: 'high', status: 'in_progress' },
    { id: 'mr2', user_id: userId, title: 'Kitchen tap leaking', category: 'Plumbing', priority: 'medium', status: 'open' },
  ])
  await admin.from('lease_documents').insert([
    { id: 'ld1', user_id: userId, lease_id: 'lease-1', name: 'Residential lease agreement', status: 'signed', signed_at: '2025-08-28' },
    { id: 'ld2', user_id: userId, lease_id: 'lease-1', name: 'Renewal offer — 2026/27', status: 'pending_signature' },
  ])
}

export async function ensurePmsData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('pms_tenants').select('id').eq('owner_id', userId).limit(1)
  if (data?.length) return

  await admin.from('pms_tenants').insert([
    { id: 'pt1', owner_id: userId, name: 'Daniel K.', unit: '4B — Cantonments', rent: 125000, lease_end: '2026-08-31', status: 'current', balance: 0 },
    { id: 'pt2', owner_id: userId, name: 'Ama B.', unit: '2A — East Legon', rent: 58000, lease_end: '2026-12-31', status: 'current', balance: 58000 },
  ])
  await admin.from('work_orders').insert([
    { id: 'wo1', owner_id: userId, unit: '4B', issue: 'AC repair', vendor: 'CoolAir GH', priority: 'high', status: 'in_progress', cost: 450 },
    { id: 'wo2', owner_id: userId, unit: '2A', issue: 'Plumbing — kitchen tap', vendor: 'FixIt Ltd', priority: 'medium', status: 'open', cost: 0 },
  ])
  await admin.from('pms_inspections').insert([
    { id: 'in1', owner_id: userId, unit: '4B', inspector: 'BaytMiftah Inspect', scheduled: '2026-06-20', status: 'scheduled' },
  ])
}

export async function ensureSmartData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('smart_devices').select('id').eq('owner_id', userId).limit(1)
  if (data?.length) return

  await admin.from('smart_devices').insert([
    { id: 'sd1', owner_id: userId, name: 'Front door lock', type: 'lock', location: 'Lobby', status: 'online', battery: 82 },
    { id: 'sd2', owner_id: userId, name: 'Water leak sensor', type: 'sensor', location: 'Unit 4B', status: 'online', battery: 91 },
    { id: 'sd3', owner_id: userId, name: 'HVAC controller', type: 'climate', location: 'Unit 4B', status: 'online' },
  ])
  await admin.from('smart_automations').insert([
    { id: 'sa1', owner_id: userId, name: 'Lock doors at 11pm', trigger_config: 'schedule 23:00', action_config: 'lock all', enabled: true },
    { id: 'sa2', owner_id: userId, name: 'Leak alert → notify', trigger_config: 'leak detected', action_config: 'push alert', enabled: true },
  ])
  await admin.from('smart_alerts').insert([
    { id: 'alert1', owner_id: userId, type: 'warning', title: 'Low battery — front lock', device: 'Front door lock', read: false },
    { id: 'alert2', owner_id: userId, type: 'info', title: 'HVAC set to eco mode', device: 'HVAC controller', read: true },
  ])
}

export async function ensureDeveloperData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('developer_projects').select('id').eq('owner_id', userId).limit(1)
  if (data?.length) return

  await admin.from('developer_projects').insert([
    { id: 'dev-proj-1', owner_id: userId, name: 'Skyline Residences', location: 'East Legon, Accra', units: 48, sold: 31, status: 'under_construction', progress: 68 },
    { id: 'dev-proj-2', owner_id: userId, name: 'Harbor View Towers', location: 'Airport Residential', units: 72, sold: 12, status: 'pre_sale', progress: 22 },
  ])
  await admin.from('developer_milestones').insert([
    { id: 'ms1', project_id: 'dev-proj-1', title: 'Foundation complete', status: 'done', due_date: '2025-11-01' },
    { id: 'ms2', project_id: 'dev-proj-1', title: 'Structural frame', status: 'in_progress', due_date: '2026-08-01' },
  ])
  await admin.from('developer_buyers').insert([
    { id: 'db1', project_id: 'dev-proj-1', name: 'Sarah A.', unit: 'Tower A — 12', status: 'contracted', amount: 1850000 },
    { id: 'db2', project_id: 'dev-proj-1', name: 'James O.', unit: 'Tower B — 4', status: 'reserved', amount: 920000 },
  ])
}

export async function ensureEnterpriseData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('enterprise_portfolios').select('id').eq('org_id', userId).limit(1)
  if (data?.length) return

  await admin.from('enterprise_portfolios').insert([
    { id: 'pf1', org_id: userId, name: 'Greater Accra Core', country: 'Ghana', assets: 84, aum: 1200000000, occupancy: '93%' },
    { id: 'pf2', org_id: userId, name: 'West Africa Mixed', country: 'Multi', assets: 58, aum: 980000000, occupancy: '88%' },
  ])
  await admin.from('enterprise_esg').insert([
    { id: 'esg1', org_id: userId, metric: 'Overall ESG score', value: '78', year: 2026 },
    { id: 'esg2', org_id: userId, metric: 'Governance rating', value: 'A-', year: 2026 },
  ])
  await admin.from('enterprise_forecasts').insert([
    { id: 'fc1', org_id: userId, year: 2026, revenue: 420000000, noi: 168000000 },
    { id: 'fc2', org_id: userId, year: 2027, revenue: 465000000, noi: 192000000 },
  ])
}

export async function ensureBuyerData(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('offers').select('id').eq('user_id', userId).limit(1)
  if (data?.length) return

  await admin.from('offers').insert([
    { id: 'o1', user_id: userId, property: 'Labone Penthouse', amount: 4000000, counter_amount: 4150000, status: 'counter', updated: '2026-06-11' },
  ])
  await admin.from('transactions').insert([
    {
      id: 'tx1', user_id: userId, property: 'Labone Penthouse', stage: 'negotiation',
      offer: 'GHS 4,000,000', counter: 'GHS 4,150,000', closing_date: '2026-07-15',
      checklist: [
        { id: 'c1', label: 'Offer submitted', done: true },
        { id: 'c2', label: 'Counter-offer received', done: true },
        { id: 'c3', label: 'Document review', done: false },
      ],
    },
  ])
}

export async function logAudit(admin: SupabaseClient, actorId: string | null, action: string, target: string, details: Record<string, unknown> = {}) {
  await admin.from('audit_events').insert({ actor_id: actorId, action, target, details }).catch(() => {})
}
