import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { logAudit } from '../_shared/user-seed.ts'
import { notifyUser } from '../_shared/notifications.ts'
import { getProfileRole, MODERATOR_ROLES } from '../_shared/roles.ts'

async function requireModerator(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const role = await getProfileRole(admin, userId)
  return MODERATOR_ROLES.has(role)
}

async function notifySubmitter(
  admin: ReturnType<typeof createAdminClient>,
  listingId: string,
  { approved, reason }: { approved: boolean; reason?: string },
) {
  const { data: listing } = await admin.from('listings').select('title, submitted_by, host').eq('id', listingId).maybeSingle()
  if (!listing?.submitted_by) return

  await notifyUser(admin, {
    userId: listing.submitted_by,
    type: 'moderation',
    title: approved ? 'Listing approved' : 'Listing needs changes',
    body: approved
      ? `${listing.title} is live with a verified badge.`
      : `${listing.title}: ${reason || 'Please update and resubmit.'}`,
    link: approved ? `/property/${listingId}` : '/host/list',
  })
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (req.method === 'GET') {
    if (action === 'overview') {
      if (!(await requireModerator(admin, user.id))) return errorResponse('Moderator access required', 403)
      const { data: pending } = await admin.from('listings').select('id, title, status, host').eq('status', 'pending_review')
      const { data: audit } = await admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(5)
      return jsonResponse({
        overview: { pendingAgencies: [], moderationQueue: pending ?? [], auditEvents: audit ?? [] },
        source: 'supabase',
      })
    }
    if (action === 'queue') {
      if (!(await requireModerator(admin, user.id))) return errorResponse('Moderator access required', 403)
      const { data } = await admin.from('listings').select('*').eq('status', 'pending_review')
      return jsonResponse({ queue: data ?? [], source: 'supabase' })
    }
    return errorResponse('Unsupported action', 404)
  }

  if (req.method === 'POST') {
    if (!(await requireModerator(admin, user.id))) return errorResponse('Moderator access required', 403)
    const body = await req.json()
    if (body.action === 'approve_listing') {
      await admin.from('listings').update({ status: 'active', verified: true }).eq('id', body.listing_id)
      await admin.from('moderation_queue').update({ status: 'approved' }).eq('listing_id', body.listing_id)
      await logAudit(admin, user.id, 'listing_approved', body.listing_id, {})
      await notifySubmitter(admin, body.listing_id, { approved: true })
      return jsonResponse({ ok: true })
    }
    if (body.action === 'reject_listing') {
      await admin.from('listings').update({ status: 'rejected' }).eq('id', body.listing_id)
      await admin.from('moderation_queue').insert({
        listing_id: body.listing_id, submitter_id: body.submitter_id, status: 'rejected', reason: body.reason,
      })
      await logAudit(admin, user.id, 'listing_rejected', body.listing_id, { reason: body.reason })
      await notifySubmitter(admin, body.listing_id, { approved: false, reason: body.reason })
      return jsonResponse({ ok: true })
    }
    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Method not allowed', 405)
})
