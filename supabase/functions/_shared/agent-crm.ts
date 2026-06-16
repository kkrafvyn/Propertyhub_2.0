import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function resolveListingAgent(
  admin: SupabaseClient,
  listingId: string | null | undefined,
): Promise<string | null> {
  if (!listingId) return null
  const { data: listing } = await admin
    .from('listings')
    .select('submitted_by, owner_id')
    .eq('id', listingId)
    .maybeSingle()
  return listing?.submitted_by ?? listing?.owner_id ?? null
}

export async function upsertLeadFromViewing(
  admin: SupabaseClient,
  viewing: {
    id: string
    listing_id: string
    user_id: string
    preferred_date?: string | null
    status?: string
  },
  agentId: string,
  listingTitle: string,
) {
  const { data: existing } = await admin
    .from('agent_leads')
    .select('id, stage')
    .eq('viewing_request_id', viewing.id)
    .maybeSingle()

  const stage = viewing.status === 'confirmed' ? 'viewing' : 'contacted'
  if (existing) {
    await admin.from('agent_leads').update({
      stage,
      updated_label: 'just now',
      property: listingTitle,
    }).eq('id', existing.id)
    return existing.id
  }

  const leadId = `lead-${crypto.randomUUID().slice(0, 8)}`
  await admin.from('agent_leads').insert({
    id: leadId,
    agent_id: agentId,
    name: `Buyer ${viewing.user_id.slice(0, 8)}`,
    property: listingTitle,
    stage,
    value: 0,
    updated_label: 'just now',
    listing_id: viewing.listing_id,
    buyer_user_id: viewing.user_id,
    source: 'viewing',
    viewing_request_id: viewing.id,
  })
  return leadId
}

export async function ensureCalendarForViewing(
  admin: SupabaseClient,
  viewing: {
    id: string
    listing_id: string
    preferred_date?: string | null
    status?: string
  },
  agentId: string,
  listingTitle: string,
  leadId?: string | null,
) {
  const { data: existing } = await admin
    .from('agent_calendar')
    .select('id')
    .eq('viewing_request_id', viewing.id)
    .maybeSingle()

  const title = `Viewing — ${listingTitle}`
  const eventDate = viewing.preferred_date ?? new Date().toISOString().slice(0, 10)

  if (existing) {
    await admin.from('agent_calendar').update({
      title,
      event_date: eventDate,
      event_type: 'viewing',
      listing_id: viewing.listing_id,
      lead_id: leadId ?? null,
    }).eq('id', existing.id)
    return existing.id
  }

  const calId = `cal-${crypto.randomUUID().slice(0, 8)}`
  await admin.from('agent_calendar').insert({
    id: calId,
    agent_id: agentId,
    title,
    event_date: eventDate,
    event_time: '10:00',
    event_type: 'viewing',
    listing_id: viewing.listing_id,
    lead_id: leadId ?? null,
    viewing_request_id: viewing.id,
  })
  return calId
}

export async function advanceLeadForTransaction(
  admin: SupabaseClient,
  transactionId: string,
  stage: 'offer' | 'closed',
) {
  const { data: tx } = await admin
    .from('transactions')
    .select('listing_id, offer_id, user_id, property, agent_id')
    .eq('id', transactionId)
    .maybeSingle()
  if (!tx?.listing_id) return

  const agentId = tx.agent_id ?? await resolveListingAgent(admin, tx.listing_id)
  if (!agentId) return

  const leadStage = stage === 'closed' ? 'closed' : 'offer'
  const { data: lead } = await admin
    .from('agent_leads')
    .select('id, stage')
    .eq('agent_id', agentId)
    .or(`transaction_id.eq.${transactionId},listing_id.eq.${tx.listing_id}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lead) {
    if (lead.stage !== leadStage) {
      await admin.from('lead_stage_history').insert({
        id: `lsh-${crypto.randomUUID().slice(0, 8)}`,
        lead_id: lead.id,
        agent_id: agentId,
        from_stage: lead.stage,
        to_stage: leadStage,
      }).catch(() => null)
    }
    await admin.from('agent_leads').update({
      stage: leadStage,
      transaction_id: transactionId,
      offer_id: tx.offer_id ?? null,
      updated_label: 'just now',
    }).eq('id', lead.id)
    return
  }

  const leadId = `lead-${crypto.randomUUID().slice(0, 8)}`
  await admin.from('agent_leads').insert({
    id: leadId,
    agent_id: agentId,
    name: `Buyer ${String(tx.user_id).slice(0, 8)}`,
    property: tx.property,
    stage: leadStage,
    value: 0,
    listing_id: tx.listing_id,
    buyer_user_id: tx.user_id,
    offer_id: tx.offer_id ?? null,
    transaction_id: transactionId,
    source: 'transaction',
    updated_label: 'just now',
  })
}

export async function logUserActivity(
  admin: SupabaseClient,
  userId: string,
  row: { category: string; title: string; body?: string; link?: string; meta?: Record<string, unknown> },
) {
  await admin.from('user_activity_events').insert({
    id: `act-${crypto.randomUUID().slice(0, 8)}`,
    user_id: userId,
    category: row.category,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    meta: row.meta ?? {},
  }).catch(() => null)
}
