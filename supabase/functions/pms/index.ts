import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensurePmsData } from '../_shared/user-seed.ts'

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
      if (action === 'dashboard') {
        const { count } = await admin.from('pms_tenants').select('*', { count: 'exact', head: true }).eq('owner_id', user.id)
        return jsonResponse({
          portfolio: { name: 'Anchorstone Properties', buildings: 4, units: count ?? 0, occupancy: '89%', collectedMtd: 486000 },
          source: 'supabase',
        })
      }
      if (action === 'tenants') {
        const { data } = await admin.from('pms_tenants').select('*').eq('owner_id', user.id)
        const tenants = (data ?? []).map((r) => ({
          id: r.id, name: r.name, unit: r.unit, rent: r.rent, leaseEnd: r.lease_end, status: r.status, balance: r.balance,
        }))
        return jsonResponse({ tenants, source: 'supabase' })
      }
      if (action === 'work_orders') {
        const { data } = await admin.from('work_orders').select('*').eq('owner_id', user.id)
        const workOrders = (data ?? []).map((r) => ({
          id: r.id, unit: r.unit, issue: r.issue, vendor: r.vendor, priority: r.priority, status: r.status, cost: r.cost,
        }))
        return jsonResponse({ workOrders, vendors: [{ id: 'v1', name: 'CoolAir GH' }, { id: 'v2', name: 'FixIt Ltd' }], source: 'supabase' })
      }
      if (action === 'rent_collection') {
        const { data } = await admin.from('pms_tenants').select('*').eq('owner_id', user.id)
        const collection = (data ?? []).map((r) => ({
          unit: r.unit, tenant: r.name, expected: r.rent, collected: r.balance > 0 ? 0 : r.rent, status: r.balance > 0 ? 'overdue' : 'paid',
        }))
        return jsonResponse({ collection, expenses: [{ label: 'Maintenance', amount: 4500 }, { label: 'Security', amount: 8200 }], source: 'supabase' })
      }
      if (action === 'inspections') {
        const { data } = await admin.from('pms_inspections').select('*').eq('owner_id', user.id)
        return jsonResponse({ inspections: data ?? [], source: 'supabase' })
      }
      return errorResponse('Unsupported action', 404)
    }
    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
