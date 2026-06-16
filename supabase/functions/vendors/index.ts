import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { logAudit } from '../_shared/user-seed.ts'

function mapVendor(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    trade: row.trade,
    specialty: row.specialty ?? row.trade,
    phone: row.phone,
    email: row.email,
    status: row.status,
    rating: Number(row.rating ?? 0),
    jobsCompleted: row.jobs_completed ?? 0,
    userId: row.user_id,
  }
}

function mapWorkOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    unit: row.unit,
    issue: row.issue,
    vendor: row.vendor,
    vendorId: row.vendor_id,
    priority: row.priority,
    status: row.status,
    cost: Number(row.cost ?? 0),
    maintenanceRequestId: row.maintenance_request_id,
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: owned } = await admin.from('vendors').select('*').eq('owner_id', user.id)
        const { data: linked } = await admin.from('vendors').select('*').eq('user_id', user.id)
        const { data: assignedJobs } = linked?.length
          ? await admin.from('work_orders').select('*').in('vendor_id', linked.map((v) => v.id)).order('created_at', { ascending: false })
          : { data: [] }

        return jsonResponse({
          vendors: (owned ?? []).map(mapVendor),
          vendorProfile: linked?.[0] ? mapVendor(linked[0]) : null,
          assignedJobs: (assignedJobs ?? []).map(mapWorkOrder),
          source: 'supabase',
        })
      }

      if (action === 'directory') {
        const { data } = await admin.from('vendors').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ vendors: (data ?? []).map(mapVendor), source: 'supabase' })
      }

      if (action === 'jobs') {
        const { data: linked } = await admin.from('vendors').select('id').eq('user_id', user.id)
        const vendorIds = (linked ?? []).map((v) => v.id)
        if (!vendorIds.length) return jsonResponse({ jobs: [], source: 'supabase' })

        const { data } = await admin.from('work_orders').select('*').in('vendor_id', vendorIds).order('created_at', { ascending: false })
        return jsonResponse({ jobs: (data ?? []).map(mapWorkOrder), source: 'supabase' })
      }

      if (action === 'open_jobs') {
        const { data: ownedVendors } = await admin.from('vendors').select('id, name').eq('owner_id', user.id)
        const { data: orders } = await admin.from('work_orders').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({
          workOrders: (orders ?? []).map(mapWorkOrder),
          vendors: (ownedVendors ?? []).map(mapVendor),
          source: 'supabase',
        })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'save_vendor') {
        const id = body.id ?? `ven-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          owner_id: user.id,
          name: String(body.name ?? '').trim(),
          trade: body.trade ?? body.specialty ?? 'general',
          specialty: body.specialty ?? body.trade ?? 'general',
          phone: body.phone ?? null,
          email: body.email ?? null,
          user_id: body.user_id ?? null,
          status: body.status ?? 'active',
        }
        if (!row.name) return errorResponse('name required', 400)
        await admin.from('vendors').upsert(row)
        await logAudit(admin, user.id, 'vendor_saved', id, { name: row.name })
        return jsonResponse({ ok: true, vendor: mapVendor(row) })
      }

      if (body.action === 'assign_job') {
        const { data: wo } = await admin.from('work_orders').select('*').eq('id', body.work_order_id).eq('owner_id', user.id).maybeSingle()
        if (!wo) return errorResponse('Work order not found', 404)

        const { data: vendor } = await admin.from('vendors').select('*').eq('id', body.vendor_id).eq('owner_id', user.id).maybeSingle()
        if (!vendor) return errorResponse('Vendor not found', 404)

        await admin.from('work_orders').update({
          vendor_id: vendor.id,
          vendor: vendor.name,
          status: 'assigned',
        }).eq('id', wo.id)

        return jsonResponse({ ok: true, work_order_id: wo.id, vendor_id: vendor.id })
      }

      if (body.action === 'update_job_status') {
        const { data: linked } = await admin.from('vendors').select('id').eq('user_id', user.id)
        const vendorIds = (linked ?? []).map((v) => v.id)
        if (!vendorIds.length) return errorResponse('Not a registered vendor', 403)

        const { data: wo } = await admin
          .from('work_orders')
          .select('*')
          .eq('id', body.work_order_id)
          .in('vendor_id', vendorIds)
          .maybeSingle()
        if (!wo) return errorResponse('Job not found', 404)

        const status = body.status ?? 'in_progress'
        await admin.from('work_orders').update({ status }).eq('id', wo.id)

        if (status === 'completed' && wo.vendor_id) {
          const { data: v } = await admin.from('vendors').select('jobs_completed').eq('id', wo.vendor_id).maybeSingle()
          if (v) {
            await admin.from('vendors').update({ jobs_completed: Number(v.jobs_completed ?? 0) + 1 }).eq('id', wo.vendor_id)
          }
        }

        return jsonResponse({ ok: true, work_order_id: wo.id, status })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
