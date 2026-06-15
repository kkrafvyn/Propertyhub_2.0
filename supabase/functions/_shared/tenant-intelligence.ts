/** Tenant intelligence — housing credit score & risk band */

import type { createAdminClient } from './supabase.ts'
import { emitPlatformEvent } from './events.ts'

export type RiskBand = 'approved' | 'standard' | 'elevated' | 'high_risk' | 'reject'

export interface TenantScore {
  user_id: string
  credit_score: number
  risk_score: number
  risk_band: RiskBand
  deposit_multiplier: number
  on_time_payments: number
  late_payments: number
  missed_payments: number
}

function computeRiskBand(creditScore: number, late: number, missed: number): RiskBand {
  if (missed >= 3 || creditScore < 500) return 'reject'
  if (missed >= 1 || creditScore < 580) return 'high_risk'
  if (late >= 2 || creditScore < 650) return 'elevated'
  if (creditScore >= 720 && missed === 0 && late === 0) return 'approved'
  return 'standard'
}

function depositMultiplierForBand(band: RiskBand): number {
  const map: Record<RiskBand, number> = {
    approved: 0.5,
    standard: 1.0,
    elevated: 1.5,
    high_risk: 2.0,
    reject: 3.0,
  }
  return map[band]
}

export async function computeTenantIntelligence(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<TenantScore> {
  const { data: payments } = await admin
    .from('payment_records')
    .select('status, purpose, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  let onTime = 0
  let late = 0
  let missed = 0
  let utilityOnTime = 0
  let utilityLate = 0

  for (const p of payments ?? []) {
    if (p.status === 'completed' || p.status === 'paid') onTime += 1
    else if (p.status === 'pending') { /* in flight */ }
    else if (p.status === 'failed') missed += 1
    else late += 1

    if (String(p.purpose).includes('utility')) {
      if (p.status === 'completed' || p.status === 'paid') utilityOnTime += 1
      else utilityLate += 1
    }
  }

  const { count: leaseCount } = await admin
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const rentalMonths = Math.min(60, (leaseCount ?? 0) * 12)
  let creditScore = 650
  creditScore += Math.min(80, onTime * 4)
  creditScore -= missed * 40
  creditScore -= late * 15
  creditScore += Math.min(30, rentalMonths)
  creditScore = Math.max(300, Math.min(850, creditScore))

  const riskScore = Math.max(0, Math.min(100, 100 - Math.floor((creditScore - 300) / 5.5)))
  const riskBand = computeRiskBand(creditScore, late, missed)

  const row = {
    user_id: userId,
    rental_history_months: rentalMonths,
    on_time_payments: onTime,
    late_payments: late,
    missed_payments: missed,
    utility_on_time: utilityOnTime,
    utility_late: utilityLate,
    credit_score: creditScore,
    risk_score: riskScore,
    risk_band: riskBand,
    deposit_multiplier: depositMultiplierForBand(riskBand),
    last_computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await admin.from('tenant_intelligence').upsert(row)

  await emitPlatformEvent(admin, {
    eventType: 'tenant.risk_updated',
    aggregateType: 'tenant',
    aggregateId: userId,
    actorId: userId,
    payload: { credit_score: creditScore, risk_band: riskBand, risk_score: riskScore },
    idempotencyKey: `tenant-risk-${userId}-${new Date().toISOString().slice(0, 10)}`,
  })

  return row as TenantScore
}

export async function getTenantIntelligence(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  recompute = false,
) {
  if (!recompute) {
    const { data } = await admin.from('tenant_intelligence').select('*').eq('user_id', userId).maybeSingle()
    if (data) return data as TenantScore
  }
  return computeTenantIntelligence(admin, userId)
}
