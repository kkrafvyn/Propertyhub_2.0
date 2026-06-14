import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

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
      const { device_id: deviceId, event_type: eventType, payload, owner_id: ownerId } = body
      if (!eventType) return errorResponse('event_type required', 400)

      let resolvedOwner = ownerId as string | null
      if (!resolvedOwner) {
        const user = await getUserFromRequest(req)
        resolvedOwner = user?.id ?? null
      }

      const { data, error } = await admin.from('iot_webhook_events').insert({
        owner_id: resolvedOwner,
        device_id: deviceId ?? null,
        event_type: eventType,
        payload: payload ?? {},
        processed: false,
      }).select('*').single()

      if (error) throw error

      if (deviceId && eventType === 'motion_detected') {
        await admin.from('smart_alerts').insert({
          owner_id: resolvedOwner,
          device_id: deviceId,
          alert_type: 'motion',
          message: `Motion detected on device ${deviceId}`,
          read: false,
        }).catch(() => null)
      }

      return jsonResponse({ ok: true, event: data })
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
