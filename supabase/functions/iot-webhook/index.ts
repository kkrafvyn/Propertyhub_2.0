import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { runEventAutomations } from '../_shared/event-automation.ts'
import { logUserActivity } from '../_shared/agent-crm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()

  try {
    if (req.method === 'POST') {
      const webhookSecret = Deno.env.get('IOT_WEBHOOK_SECRET')
      const authHeader = req.headers.get('authorization') ?? ''
      if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        const user = await getUserFromRequest(req)
        if (!user) return errorResponse('Unauthorized webhook', 401)
      }

      const body = await req.json()
      const { device_id: deviceId, event_type: eventType, payload, owner_id: ownerId, property_id: propertyId } = body
      if (!eventType) return errorResponse('event_type required', 400)

      let resolvedOwner = ownerId as string | null
      let resolvedProperty = propertyId as string | null

      if (deviceId && !resolvedOwner) {
        const { data: device } = await admin.from('smart_devices').select('owner_id, property_id, name').eq('id', deviceId).maybeSingle()
        resolvedOwner = device?.owner_id ?? null
        resolvedProperty = resolvedProperty ?? device?.property_id ?? null
      }

      if (!resolvedOwner) {
        const user = await getUserFromRequest(req)
        resolvedOwner = user?.id ?? null
      }

      const { data, error } = await admin.from('iot_webhook_events').insert({
        owner_id: resolvedOwner,
        device_id: deviceId ?? null,
        property_id: resolvedProperty ?? null,
        event_type: eventType,
        payload: payload ?? {},
        processed: false,
      }).select('*').single()

      if (error) throw error

      const alertTitle = eventType.replace(/[._]/g, ' ')
      const alertId = `sa-${crypto.randomUUID().slice(0, 8)}`

      if (resolvedOwner && ['motion_detected', 'device_offline', 'leak_detected'].includes(eventType)) {
        await admin.from('smart_alerts').insert({
          id: alertId,
          owner_id: resolvedOwner,
          type: eventType.includes('leak') ? 'warning' : 'info',
          title: alertTitle,
          device: deviceId ?? 'unknown',
          read: false,
        }).catch(() => null)

        const automationType = eventType === 'motion_detected'
          ? 'iot.motion_detected'
          : eventType === 'device_offline'
            ? 'iot.device_offline'
            : 'iot.leak_detected'

        await runEventAutomations(admin, {
          eventType: automationType,
          userId: resolvedOwner,
          payload: {
            device_id: deviceId ?? '',
            property_id: resolvedProperty ?? '',
          },
        })

        await logUserActivity(admin, resolvedOwner, {
          category: 'smart',
          title: alertTitle,
          body: deviceId ? `Device ${deviceId}` : undefined,
          link: '/my-home',
        })
      }

      await admin.from('iot_webhook_events').update({
        processed: true,
        processed_at: new Date().toISOString(),
      }).eq('id', data.id)

      return jsonResponse({ ok: true, event: data })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
