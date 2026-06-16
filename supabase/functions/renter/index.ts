import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureRenterData, logAudit } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureRenterData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: lease } = await admin.from('leases').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle()
        return jsonResponse({
          profile: {
            name: user.email?.split('@')[0] ?? 'Renter',
            unit: lease?.property ?? '—',
            landlord: lease?.landlord ?? '—',
            leaseEnd: lease?.end_date ?? '—',
            rentAmount: lease?.rent ?? 0,
            rentDueDay: 1,
          },
          source: 'supabase',
        })
      }
      if (action === 'leases') {
        const { data } = await admin.from('leases').select('*').eq('user_id', user.id)
        const leases = (data ?? []).map((r) => ({
          id: r.id, property: r.property, landlord: r.landlord, start: r.start_date, end: r.end_date,
          rent: r.rent, status: r.status, signed: r.signed,
        }))
        return jsonResponse({ leases, source: 'supabase' })
      }
      if (action === 'payments') {
        const { data } = await admin.from('rent_payments').select('*').eq('user_id', user.id).order('due_date', { ascending: false })
        const payments = (data ?? []).map((r) => ({
          id: r.id, period: r.period, amount: r.amount, due: r.due_date, status: r.status, method: r.method,
        }))
        return jsonResponse({ payments, source: 'supabase' })
      }
      if (action === 'applications') {
        const { data } = await admin.from('rental_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        const applications = (data ?? []).map((r) => ({
          id: r.id,
          property: r.property,
          listingId: r.listing_id,
          status: r.status,
          moveInDate: r.move_in_date,
          leaseId: r.lease_id,
          createdAt: r.created_at,
        }))
        return jsonResponse({ applications, source: 'supabase' })
      }
      if (action === 'incoming_applications') {
        const { data: listings } = await admin
          .from('listings')
          .select('id')
          .or(`submitted_by.eq.${user.id},owner_id.eq.${user.id}`)
        const listingIds = (listings ?? []).map((l) => l.id)

        const { data: byLandlord } = await admin
          .from('rental_applications')
          .select('*')
          .eq('landlord_id', user.id)
          .order('created_at', { ascending: false })

        const { data: byListing } = listingIds.length
          ? await admin.from('rental_applications').select('*').in('listing_id', listingIds).order('created_at', { ascending: false })
          : { data: [] }

        const seen = new Set<string>()
        const merged = [...(byLandlord ?? []), ...(byListing ?? [])].filter((r) => {
          if (seen.has(r.id)) return false
          seen.add(r.id)
          return true
        })

        const applications = merged.map((r) => ({
          id: r.id,
          property: r.property,
          listingId: r.listing_id,
          status: r.status,
          moveInDate: r.move_in_date,
          income: r.income,
          occupants: r.occupants,
          notes: r.notes,
          leaseId: r.lease_id,
          createdAt: r.created_at,
        }))
        return jsonResponse({ applications, source: 'supabase' })
      }
      if (action === 'maintenance') {
        const { data } = await admin.from('maintenance_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        const requests = (data ?? []).map((r) => ({
          id: r.id, title: r.title, category: r.category, priority: r.priority, status: r.status,
          submitted: r.created_at?.slice(0, 10), updated: r.created_at?.slice(0, 10),
        }))
        return jsonResponse({ requests, source: 'supabase' })
      }
      if (action === 'lease_documents') {
        const { data } = await admin.from('lease_documents').select('*').eq('user_id', user.id)
        const documents = (data ?? []).map((r) => ({
          id: r.id, name: r.name, status: r.status, signedAt: r.signed_at,
        }))
        return jsonResponse({ documents, source: 'supabase' })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'create_maintenance') {
        const row = {
          id: `mr-${crypto.randomUUID().slice(0, 8)}`,
          user_id: user.id,
          title: body.request?.title ?? body.title,
          category: body.request?.category ?? 'General',
          priority: body.request?.priority ?? 'medium',
          status: 'open',
          notes: body.request?.notes ?? '',
          listing_id: body.listing_id ?? null,
          unit: body.unit ?? null,
        }
        const { data, error } = await admin.from('maintenance_requests').insert(row).select('*').single()
        if (error) return errorResponse(error.message, 400)

        const { data: lease } = await admin.from('leases').select('property').eq('user_id', user.id).eq('status', 'active').maybeSingle()
        const unit = row.unit ?? lease?.property ?? 'Tenant unit'
        const woId = `wo-${crypto.randomUUID().slice(0, 8)}`
        const { data: pmsOwner } = await admin.from('pms_tenants').select('owner_id').eq('user_id', user.id).maybeSingle()
        const ownerId = pmsOwner?.owner_id ?? user.id

        await admin.from('work_orders').insert({
          id: woId,
          owner_id: ownerId,
          unit,
          issue: row.title,
          vendor: 'Unassigned',
          priority: row.priority,
          status: 'open',
          cost: 0,
          maintenance_request_id: row.id,
        }).catch(() => null)

        await admin.from('maintenance_requests').update({ work_order_id: woId }).eq('id', row.id)

        return jsonResponse({ ok: true, request: data, work_order_id: woId })
      }

      if (body.action === 'submit_application') {
        const listingId = body.listing_id
        const property = String(body.property ?? '').trim()
        if (!property) return errorResponse('property required', 400)

        let landlordId = null
        if (listingId) {
          const { data: listing } = await admin.from('listings').select('submitted_by, owner_id, title').eq('id', listingId).maybeSingle()
          landlordId = listing?.owner_id ?? listing?.submitted_by ?? null
        }

        const id = `ra-${crypto.randomUUID().slice(0, 8)}`
        const { data, error } = await admin.from('rental_applications').insert({
          id,
          user_id: user.id,
          listing_id: listingId ?? 'unknown',
          property,
          landlord_id: landlordId,
          status: 'submitted',
          move_in_date: body.move_in_date ?? null,
          income: body.income ?? null,
          occupants: body.occupants ?? 1,
          notes: body.notes ?? '',
        }).select('*').single()
        if (error) return errorResponse(error.message, 400)
        await logAudit(admin, user.id, 'rental_application_submitted', id, { listing_id: listingId })
        return jsonResponse({ ok: true, application: data })
      }

      if (body.action === 'review_application') {
        const { data: app } = await admin.from('rental_applications').select('*').eq('id', body.application_id).maybeSingle()
        if (!app) return errorResponse('Application not found', 404)

        const { data: listing } = app.listing_id
          ? await admin.from('listings').select('submitted_by, owner_id').eq('id', app.listing_id).maybeSingle()
          : { data: null }
        const isLandlord = listing && (listing.submitted_by === user.id || listing.owner_id === user.id)
        if (!isLandlord && app.landlord_id !== user.id) return errorResponse('Forbidden', 403)

        const decision = body.decision === 'approved' ? 'approved' : 'rejected'
        await admin.from('rental_applications').update({
          status: decision,
          reviewed_at: new Date().toISOString(),
        }).eq('id', app.id)

        if (decision === 'approved') {
          const leaseId = `lease-${crypto.randomUUID().slice(0, 8)}`
          await admin.from('leases').insert({
            id: leaseId,
            user_id: app.user_id,
            property: app.property,
            landlord: user.email?.split('@')[0] ?? 'Landlord',
            start_date: app.move_in_date ?? new Date().toISOString().slice(0, 10),
            end_date: null,
            rent: app.income ? Math.round(Number(app.income) * 0.3) : 0,
            status: 'pending_signature',
            signed: false,
          })
          await admin.from('rental_applications').update({ lease_id: leaseId }).eq('id', app.id)
          await admin.from('lease_documents').insert({
            id: `ld-${crypto.randomUUID().slice(0, 8)}`,
            user_id: app.user_id,
            lease_id: leaseId,
            name: 'Residential lease agreement',
            status: 'pending_signature',
          }).catch(() => null)
          return jsonResponse({ ok: true, status: decision, lease_id: leaseId })
        }

        return jsonResponse({ ok: true, status: decision })
      }

      if (body.action === 'sign_lease') {
        await admin.from('lease_documents').update({ status: 'signed', signed_at: new Date().toISOString().slice(0, 10) })
          .eq('id', body.document_id).eq('user_id', user.id)
        await logAudit(admin, user.id, 'lease_signed', body.document_id, {})
        return jsonResponse({ ok: true, document_id: body.document_id, signed_at: new Date().toISOString() })
      }
      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
