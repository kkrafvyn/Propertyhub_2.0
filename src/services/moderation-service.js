import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { isAdminRole, isAgencyRole } from '../lib/roles'
import { fetchUserProfile } from '../lib/supabase-db'

const MODERATOR_ROLES = new Set(['agency_owner', 'agency_manager', 'platform_admin'])

async function assertModerator() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please sign in to continue.')
  const profile = await fetchUserProfile(user.id)
  const role = profile?.role
  if (!isAdminRole(role) && !isAgencyRole(role) && !MODERATOR_ROLES.has(role)) {
    throw new Error('Moderator access required.')
  }
  return user
}

export async function fetchModerationQueue() {
  try {
    const payload = await callEdgeFunction('moderation', {
      allowAnonymous: false,
      query: { action: 'queue' },
    })
    if (payload?.queue) return { queue: payload.queue, source: payload.source || 'supabase' }
  } catch { /* direct fallback */ }

  if (supabase) {
    await assertModerator()
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
    if (!error) return { queue: data ?? [], source: 'supabase' }
  }

  return { queue: [], source: 'local' }
}

export async function approveListing(listingId) {
  try {
    return await callEdgeFunction('moderation', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'approve_listing', listing_id: listingId },
    })
  } catch {
    await assertModerator()
    const { error } = await supabase
      .from('listings')
      .update({ status: 'active', verified: true, updated_at: new Date().toISOString() })
      .eq('id', listingId)
    if (error) throw error
    await supabase.from('moderation_queue').update({ status: 'approved' }).eq('listing_id', listingId)
    return { ok: true, source: 'supabase' }
  }
}

export async function rejectListing(listingId, reason = 'Needs changes', submitterId = null) {
  try {
    return await callEdgeFunction('moderation', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'reject_listing',
        listing_id: listingId,
        reason,
        submitter_id: submitterId,
      },
    })
  } catch {
    await assertModerator()
    const { error } = await supabase
      .from('listings')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', listingId)
    if (error) throw error
    await supabase.from('moderation_queue').insert({
      listing_id: listingId,
      submitter_id: submitterId,
      status: 'rejected',
      reason,
    })
    return { ok: true, source: 'supabase' }
  }
}

export default { fetchModerationQueue, approveListing, rejectListing }
