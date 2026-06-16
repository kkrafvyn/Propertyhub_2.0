/** Reputation score from reviews, KYC, and payment history */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function computeReputationScore(admin: SupabaseClient, userId: string) {
  const { data: reviews } = await admin.from('reviews').select('rating').eq('user_id', userId)
  const reviewAvg = reviews?.length
    ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length
    : 0
  const reviewBonus = reviewAvg > 0 ? Math.min(20, (reviewAvg - 3) * 8) : 0

  const { data: kyc } = await admin
    .from('kyc_records')
    .select('status, entity_type')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .limit(1)
    .maybeSingle()
  const kycBonus = kyc ? (kyc.entity_type === 'agency' || kyc.entity_type === 'agent' ? 15 : 10) : 0

  const { count: paymentCount } = await admin
    .from('payment_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
  const paymentBonus = Math.min(15, (paymentCount ?? 0) * 2)

  const score = Math.min(100, Math.max(0, 50 + reviewBonus + kycBonus + paymentBonus))

  const row = {
    user_id: userId,
    score,
    review_avg: reviewAvg,
    kyc_bonus: kycBonus,
    payment_bonus: paymentBonus,
    factors: { review_count: reviews?.length ?? 0, payments: paymentCount ?? 0, kyc: kyc?.entity_type ?? null },
    updated_at: new Date().toISOString(),
  }

  await admin.from('reputation_scores').upsert(row)
  return row
}

export async function computePropertyScore(admin: SupabaseClient, listingId: string) {
  const { data: listing } = await admin.from('listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return null

  let score = 65
  const factors: Record<string, unknown> = {}

  const photos = listing.photos as unknown[] | undefined
  if (photos?.length && photos.length >= 4) { score += 10; factors.photos = 'good' }
  else factors.photos = 'needs_more'

  if (listing.verified) { score += 8; factors.verified = true }
  if (listing.description && String(listing.description).length > 80) score += 5

  const { count: reviewCount } = await admin
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
  if ((reviewCount ?? 0) >= 3) score += 7

  const { data: val } = await admin
    .from('valuations')
    .select('confidence')
    .eq('user_id', listing.submitted_by)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (val?.confidence && Number(val.confidence) >= 85) score += 5

  score = Math.min(100, score)
  const row = { listing_id: listingId, score, factors, updated_at: new Date().toISOString() }
  await admin.from('property_scores').upsert(row)
  return row
}
