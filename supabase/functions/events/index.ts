import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { emitPlatformEvent, listPlatformEvents } from '../_shared/events.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      const user = await getUserFromRequest(req)

      if (action === 'types') {
        return jsonResponse({
          event_types: [
            'booking.created', 'booking.confirmed', 'booking.modules_activated',
            'utility.meter.updated', 'utility.bill.generated', 'utility.bill.paid',
            'payment.initiated', 'payment.completed', 'payment.failed',
            'tenant.risk_updated', 'wallet.credited', 'wallet.debited', 'ledger.entry_recorded',
          ],
          transport: 'database',
          future: 'kafka | nats',
          source: 'events',
        })
      }

      if (!user) return errorResponse('Authentication required', 401)

      const events = await listPlatformEvents(admin, {
        eventType: url.searchParams.get('event_type') ?? undefined,
        aggregateType: url.searchParams.get('aggregate_type') ?? undefined,
        aggregateId: url.searchParams.get('aggregate_id') ?? undefined,
        limit: Number(url.searchParams.get('limit') ?? 50),
      })

      const actorFiltered = events.filter(
        (e) => e.actor_id === user.id || url.searchParams.get('scope') === 'all',
      )

      return jsonResponse({ events: actorFiltered, count: actorFiltered.length, source: 'supabase' })
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      const body = await req.json()

      if (body.action === 'publish') {
        const result = await emitPlatformEvent(admin, {
          eventType: body.event_type,
          aggregateType: body.aggregate_type,
          aggregateId: body.aggregate_id,
          actorId: user.id,
          regionId: body.region_id,
          payload: body.payload,
          metadata: body.metadata,
          idempotencyKey: body.idempotency_key,
        })
        if (!result) return errorResponse('Event publish failed or duplicate', 409)
        return jsonResponse({ ok: true, event: result })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
