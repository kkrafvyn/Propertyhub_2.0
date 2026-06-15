/** Nightly-style analytics aggregation into analytics_facts */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function aggregateAnalyticsFacts(admin: SupabaseClient, regionId = 'africa_ghana') {
  const period = currentPeriod()
  const facts: Record<string, unknown>[] = []

  const { data: tenants } = await admin.from('pms_tenants').select('rent, balance')
  if (tenants?.length) {
    const rents = tenants.map((t) => Number(t.rent)).filter((r) => r > 0)
    const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] ?? 0
    facts.push({
      id: `af-rent-median-${period}`,
      fact_type: 'rent_median',
      region_id: regionId,
      country: 'GH',
      dimension_key: 'portfolio',
      dimension_value: 'all',
      metric_value: median,
      currency: 'GHS',
      period,
    })
  }

  const { data: bills } = await admin.from('utility_bills').select('amount, utility_type').eq('status', 'paid')
  if (bills?.length) {
    const byType: Record<string, number[]> = {}
    for (const b of bills) {
      const t = String(b.utility_type ?? 'electricity')
      byType[t] = byType[t] ?? []
      byType[t].push(Number(b.amount))
    }
    for (const [utilityType, amounts] of Object.entries(byType)) {
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      facts.push({
        id: `af-util-${utilityType}-${period}`,
        fact_type: 'utility_cost_avg',
        region_id: regionId,
        country: 'GH',
        dimension_key: 'utility_type',
        dimension_value: utilityType,
        metric_value: Math.round(avg * 100) / 100,
        currency: 'GHS',
        period,
      })
    }
  }

  const { data: intel } = await admin.from('tenant_intelligence').select('missed_payments, on_time_payments, late_payments')
  if (intel?.length) {
    const total = intel.reduce((s, r) => s + Number(r.on_time_payments) + Number(r.late_payments) + Number(r.missed_payments), 0)
    const missed = intel.reduce((s, r) => s + Number(r.missed_payments), 0)
    const rate = total > 0 ? missed / total : 0
    facts.push({
      id: `af-default-${period}`,
      fact_type: 'default_rate',
      region_id: regionId,
      country: 'GH',
      dimension_key: 'segment',
      dimension_value: 'long_term',
      metric_value: Math.round(rate * 10000) / 10000,
      currency: null,
      period,
    })
  }

  const { count: paymentCount } = await admin
    .from('payment_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  facts.push({
    id: `af-payments-${period}`,
    fact_type: 'payment_volume',
    region_id: regionId,
    country: 'GH',
    dimension_key: 'status',
    dimension_value: 'completed',
    metric_value: paymentCount ?? 0,
    currency: null,
    period,
  })

  for (const fact of facts) {
    await admin.from('analytics_facts').upsert(fact, { onConflict: 'id' })
  }

  return { period, count: facts.length, facts }
}
