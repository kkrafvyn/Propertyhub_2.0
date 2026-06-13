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
        }
        const { data, error } = await admin.from('maintenance_requests').insert(row).select('*').single()
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ ok: true, request: data })
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
