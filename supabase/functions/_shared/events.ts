/** Platform event bus — Kafka/NATS-ready append-only events */

import type { createAdminClient } from './supabase.ts'

export type PlatformEventType =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.modules_activated'
  | 'utility.meter.updated'
  | 'utility.bill.generated'
  | 'utility.bill.paid'
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'tenant.risk_updated'
  | 'wallet.credited'
  | 'wallet.debited'
  | 'ledger.entry_recorded'

export interface EmitEventInput {
  eventType: PlatformEventType | string
  aggregateType: string
  aggregateId: string
  actorId?: string | null
  regionId?: string | null
  payload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  idempotencyKey?: string
}

export async function emitPlatformEvent(
  admin: ReturnType<typeof createAdminClient>,
  input: EmitEventInput,
): Promise<{ id: string; event_type: string } | null> {
  const id = `evt-${crypto.randomUUID().slice(0, 12)}`
  const row = {
    id,
    event_type: input.eventType,
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId,
    actor_id: input.actorId ?? null,
    region_id: input.regionId ?? null,
    payload: input.payload ?? {},
    metadata: input.metadata ?? {},
    idempotency_key: input.idempotencyKey ?? null,
  }

  const { error } = await admin.from('platform_events').insert(row)
  if (error) {
    if (error.message.includes('idempotency')) return null
    console.error('emitPlatformEvent failed', error.message)
    return null
  }
  return { id, event_type: input.eventType }
}

export async function listPlatformEvents(
  admin: ReturnType<typeof createAdminClient>,
  filters: {
    eventType?: string
    aggregateType?: string
    aggregateId?: string
    limit?: number
  },
) {
  let q = admin.from('platform_events').select('*').order('published_at', { ascending: false })
  if (filters.eventType) q = q.eq('event_type', filters.eventType)
  if (filters.aggregateType) q = q.eq('aggregate_type', filters.aggregateType)
  if (filters.aggregateId) q = q.eq('aggregate_id', filters.aggregateId)
  const { data } = await q.limit(filters.limit ?? 50)
  return data ?? []
}
