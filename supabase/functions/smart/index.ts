import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureSmartData } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureSmartData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: devices } = await admin.from('smart_devices').select('status').eq('owner_id', user.id)
        const online = (devices ?? []).filter((d) => d.status === 'online').length
        return jsonResponse({
          portfolio: {
            building: 'Cantonments Sky Villa', devicesOnline: online, devicesTotal: devices?.length ?? 0,
            automationsActive: 5, alertsToday: 3, energyToday: '42.8 kWh',
          },
          source: 'supabase',
        })
      }
      if (action === 'devices') {
        const { data } = await admin.from('smart_devices').select('*').eq('owner_id', user.id)
        return jsonResponse({ devices: data ?? [], source: 'supabase' })
      }
      if (action === 'automations') {
        const { data } = await admin.from('smart_automations').select('*').eq('owner_id', user.id)
        return jsonResponse({ automations: data ?? [], source: 'supabase' })
      }
      if (action === 'alerts') {
        const { data } = await admin.from('smart_alerts').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ alerts: data ?? [], logs: [], source: 'supabase' })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'toggle_automation') {
        await admin.from('smart_automations').update({ enabled: body.enabled })
          .eq('id', body.automation_id).eq('owner_id', user.id)
        return jsonResponse({ ok: true, automation_id: body.automation_id, enabled: body.enabled })
      }
      if (body.action === 'mark_alert_read') {
        await admin.from('smart_alerts').update({ read: true }).eq('id', body.alert_id).eq('owner_id', user.id)
        return jsonResponse({ ok: true })
      }
      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
