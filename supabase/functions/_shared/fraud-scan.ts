/** Continuous fraud rules — listings and payments */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function runFraudScan(admin: SupabaseClient) {
  const alerts: { id: string; target: string; alert_type: string; risk_score: number }[] = []

  const { data: rules } = await admin.from('fraud_rules').select('*').eq('enabled', true)
  const highAmountThreshold = Number(rules?.find((r) => r.rule_type === 'high_payment')?.threshold ?? 500000)

  const { data: recentListings } = await admin
    .from('listings')
    .select('id, title, price, photos, submitted_by')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  for (const listing of recentListings ?? []) {
    const photos = listing.photos as unknown[] | undefined
    if (!photos?.length) {
      const id = `fa-${crypto.randomUUID().slice(0, 8)}`
      await admin.from('fraud_alerts').upsert({
        id,
        target: listing.title ?? listing.id,
        alert_type: 'listing_no_photos',
        risk_score: 72,
        status: 'open',
        metadata: { listing_id: listing.id },
      }, { onConflict: 'id' }).catch(() =>
        admin.from('fraud_alerts').insert({
          id,
          target: listing.title ?? listing.id,
          alert_type: 'listing_no_photos',
          risk_score: 72,
          status: 'open',
        }),
      )
      alerts.push({ id, target: String(listing.title), alert_type: 'listing_no_photos', risk_score: 72 })
    }

    if (Number(listing.price) > highAmountThreshold) {
      const id = `fa-${crypto.randomUUID().slice(0, 8)}`
      await admin.from('fraud_alerts').insert({
        id,
        target: listing.title ?? listing.id,
        alert_type: 'high_listing_price',
        risk_score: 65,
        status: 'open',
      }).catch(() => null)
      alerts.push({ id, target: String(listing.title), alert_type: 'high_listing_price', risk_score: 65 })
    }
  }

  const { data: bigPayments } = await admin
    .from('payment_records')
    .select('id, user_id, amount, purpose')
    .gte('amount', highAmountThreshold)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  for (const p of bigPayments ?? []) {
    const id = `fa-${crypto.randomUUID().slice(0, 8)}`
    await admin.from('fraud_alerts').insert({
      id,
      target: p.purpose ?? p.id,
      alert_type: 'high_payment',
      risk_score: 78,
      status: 'open',
    }).catch(() => null)
    alerts.push({ id, target: String(p.purpose), alert_type: 'high_payment', risk_score: 78 })
  }

  return { scanned: (recentListings?.length ?? 0) + (bigPayments?.length ?? 0), alerts_created: alerts.length, alerts }
}
