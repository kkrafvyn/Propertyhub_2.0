import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensurePmsData } from '../_shared/user-seed.ts'
import { getTenantIntelligence } from '../_shared/tenant-intelligence.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensurePmsData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard' || action === 'arrears') {
        const { data: tenantRows } = await admin.from('pms_tenants').select('*').eq('owner_id', user.id)
        const rentArrears = (tenantRows ?? [])
          .filter((t) => Number(t.balance) > 0)
          .reduce((s, t) => s + Number(t.balance), 0)

        const { data: unpaidBills } = await admin.from('utility_bills').select('amount, status').eq('status', 'unpaid')
        const utilityArrears = (unpaidBills ?? []).reduce((s, b) => s + Number(b.amount), 0)
        const collectedMtd = (tenantRows ?? [])
          .filter((t) => Number(t.balance) <= 0)
          .reduce((s, t) => s + Number(t.rent), 0)

        const portfolio = {
          name: 'Anchorstone Properties',
          buildings: 4,
          units: tenantRows?.length ?? 0,
          occupancy: tenantRows?.length ? `${Math.round(((tenantRows.length - (tenantRows.filter((t) => t.status === 'vacant').length)) / tenantRows.length) * 100)}%` : '0%',
          collectedMtd: collectedMtd || 486000,
          rentArrears,
          utilityArrears,
          totalArrears: rentArrears + utilityArrears,
        }

        if (action === 'arrears') {
          const rentItems = (tenantRows ?? [])
            .filter((t) => Number(t.balance) > 0)
            .map((t) => ({
              id: t.id,
              type: 'rent',
              tenant: t.name,
              unit: t.unit,
              amount: Number(t.balance),
              status: 'overdue',
            }))

          const { data: billsDetail } = await admin
            .from('utility_bills')
            .select('id, utility_type, provider_name, amount, billing_month, utility_account_id, status')
            .eq('status', 'unpaid')
            .order('billing_month', { ascending: false })
            .limit(50)

          const utilityItems = (billsDetail ?? []).map((b) => ({
            id: b.id,
            type: 'utility',
            tenant: b.utility_account_id,
            unit: b.provider_name ?? b.utility_type,
            amount: Number(b.amount),
            status: 'unpaid',
            month: b.billing_month,
          }))

          return jsonResponse({
            summary: portfolio,
            arrears: [...rentItems, ...utilityItems],
            source: 'supabase',
          })
        }

        return jsonResponse({ portfolio, source: 'supabase' })
      }

      if (action === 'tenants') {
        const { data } = await admin.from('pms_tenants').select('*').eq('owner_id', user.id)
        const tenants = await Promise.all((data ?? []).map(async (r) => {
          let credit = null
          if (r.user_id) {
            try {
              credit = await getTenantIntelligence(admin, r.user_id, false)
            } catch { /* skip */ }
          }
          return {
            id: r.id,
            name: r.name,
            unit: r.unit,
            rent: r.rent,
            leaseEnd: r.lease_end,
            status: r.status,
            balance: r.balance,
            userId: r.user_id,
            creditScore: credit?.credit_score ?? null,
            riskBand: credit?.risk_band ?? null,
            depositMultiplier: credit?.deposit_multiplier ?? null,
          }
        }))
        return jsonResponse({ tenants, source: 'supabase' })
      }
      if (action === 'work_orders') {
        const { data } = await admin.from('work_orders').select('*').eq('owner_id', user.id)
        const { data: vendorRows } = await admin.from('vendors').select('*').eq('owner_id', user.id)
        const workOrders = (data ?? []).map((r) => ({
          id: r.id, unit: r.unit, issue: r.issue, vendor: r.vendor, vendorId: r.vendor_id, priority: r.priority, status: r.status, cost: r.cost,
        }))
        const vendors = (vendorRows ?? []).map((r) => ({
          id: r.id, name: r.name, specialty: r.specialty ?? r.trade, rating: Number(r.rating ?? 0), jobs: r.jobs_completed ?? 0,
        }))
        return jsonResponse({ workOrders, vendors, source: 'supabase' })
      }
      if (action === 'rent_collection') {
        const { data } = await admin.from('pms_tenants').select('*').eq('owner_id', user.id)
        const { data: unpaidBills } = await admin.from('utility_bills').select('*').eq('status', 'unpaid')
        const utilityTotal = (unpaidBills ?? []).reduce((s, b) => s + Number(b.amount), 0)

        const collection = (data ?? []).map((r) => ({
          id: r.id,
          unit: r.unit,
          tenant: r.name,
          amount: r.rent,
          expected: r.rent,
          collected: r.balance > 0 ? 0 : r.rent,
          status: r.balance > 0 ? 'overdue' : 'paid',
        }))
        return jsonResponse({
          collection,
          utilityArrears: utilityTotal,
          utilityBills: (unpaidBills ?? []).slice(0, 20),
          expenses: [{ id: 'e1', category: 'Maintenance', description: 'HVAC service', amount: 4500 }, { id: 'e2', category: 'Security', description: 'Monthly guard', amount: 8200 }],
          source: 'supabase',
        })
      }
      if (action === 'inspections') {
        const { data } = await admin.from('pms_inspections').select('*').eq('owner_id', user.id)
        return jsonResponse({ inspections: data ?? [], source: 'supabase' })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'link_tenant_user') {
        const tenantId = body.tenant_id
        const tenantUserId = body.user_id
        if (!tenantId || !tenantUserId) return errorResponse('tenant_id and user_id required', 400)
        const { data: row } = await admin.from('pms_tenants').select('id').eq('id', tenantId).eq('owner_id', user.id).maybeSingle()
        if (!row) return errorResponse('Tenant not found', 404)
        await admin.from('pms_tenants').update({ user_id: tenantUserId }).eq('id', tenantId)
        return jsonResponse({ ok: true, tenant_id: tenantId, user_id: tenantUserId })
      }
      if (body.action === 'create_tenant') {
        const id = `tn-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          owner_id: user.id,
          name: body.name,
          unit: body.unit,
          rent: Number(body.rent) || 0,
          lease_end: body.lease_end ?? null,
          status: body.status ?? 'current',
          balance: 0,
        }
        if (!row.name || !row.unit) return errorResponse('name and unit required', 400)
        await admin.from('pms_tenants').insert(row)
        return jsonResponse({ ok: true, tenant: row })
      }
      if (body.action === 'schedule_inspection') {
        const id = `in-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          owner_id: user.id,
          unit: body.unit,
          inspector: body.inspector ?? 'Assigned inspector',
          scheduled: body.scheduled ?? body.date ?? new Date().toISOString().slice(0, 10),
          status: 'scheduled',
        }
        if (!row.unit) return errorResponse('unit required', 400)
        await admin.from('pms_inspections').insert(row)
        return jsonResponse({
          ok: true,
          inspection: {
            id: row.id,
            unit: row.unit,
            type: body.type ?? 'Routine',
            date: row.scheduled,
            inspector: row.inspector,
            status: row.status,
            score: null,
          },
        })
      }
      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
