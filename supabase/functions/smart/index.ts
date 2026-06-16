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
  const today = new Date().toISOString().slice(0, 10)

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const [{ data: devices }, { count: automationsActive }, { count: alertsToday }, { data: energy }] = await Promise.all([
          admin.from('smart_devices').select('status, property_id').eq('owner_id', user.id),
          admin.from('smart_automations').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('enabled', true),
          admin.from('smart_alerts').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', `${today}T00:00:00`),
          admin.from('energy_readings').select('kwh').order('period', { ascending: false }).limit(1).maybeSingle(),
        ])
        const online = (devices ?? []).filter((d) => d.status === 'online').length
        const building = devices?.[0]?.property_id ?? 'My property'

        return jsonResponse({
          portfolio: {
            building,
            devicesOnline: online,
            devicesTotal: devices?.length ?? 0,
            automationsActive: automationsActive ?? 0,
            alertsToday: alertsToday ?? 0,
            energyToday: energy?.kwh ? `${energy.kwh} kWh` : '—',
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
        const automations = (data ?? []).map((r) => ({
          ...r,
          trigger: r.trigger_config,
          action: r.action_config,
        }))
        return jsonResponse({ automations, source: 'supabase' })
      }
      if (action === 'alerts') {
        const [{ data: alerts }, { data: logs }] = await Promise.all([
          admin.from('smart_alerts').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(20),
          admin.from('iot_webhook_events').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(20),
        ])
        const eventLogs = (logs ?? []).map((e) => ({
          id: e.id,
          type: e.event_type,
          device: e.device_id,
          at: e.created_at,
        }))
        return jsonResponse({ alerts: alerts ?? [], logs: eventLogs, source: 'supabase' })
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
      if (body.action === 'create_device') {
        const id = `sd-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          owner_id: user.id,
          name: body.name ?? 'New device',
          type: body.type ?? 'sensor',
          location: body.location ?? '',
          status: 'online',
          battery: body.battery ?? null,
          last_seen: new Date().toISOString(),
        }
        if (!body.name) return errorResponse('name required', 400)
        await admin.from('smart_devices').insert(row)
        return jsonResponse({ ok: true, device: row })
      }
      if (body.action === 'create_automation') {
        const id = `sa-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          owner_id: user.id,
          name: body.name ?? 'New automation',
          trigger_config: body.trigger ?? body.trigger_config ?? 'Manual trigger',
          action_config: body.action_config ?? body.action ?? 'Notify owner',
          enabled: body.enabled ?? true,
        }
        if (!body.name) return errorResponse('name required', 400)
        await admin.from('smart_automations').insert(row)
        return jsonResponse({
          ok: true,
          automation: { ...row, trigger: row.trigger_config, action: row.action_config },
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
