import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { createReviewInDb, fetchReviewsFromDb } from '../lib/supabase-db'

export async function fetchReviews(listingId) {
  const rows = await fetchReviewsFromDb(listingId)
  if (rows) return { reviews: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'reviews', listing_id: listingId },
    })
    if (payload?.reviews?.length) return { reviews: payload.reviews, source: 'supabase' }
  } catch { /* fallback */ }

  return { reviews: [], source: 'local' }
}

export async function checkReviewEligibility(listingId) {
  if (!supabase) return { eligible: true, reason: 'offline' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { eligible: false, reason: 'login_required' }

  const { data: viewing } = await supabase
    .from('viewing_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .eq('status', 'confirmed')
    .limit(1)
    .maybeSingle()

  const { data: stay } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('guest_id', user.id)
    .eq('listing_id', listingId)
    .in('status', ['confirmed', 'completed'])
    .limit(1)
    .maybeSingle()

  if (viewing || stay) return { eligible: true, viewingId: viewing?.id, reservationId: stay?.id }

  return { eligible: false, reason: 'complete_viewing_or_stay' }
}

export async function submitReview({ listingId, rating, body, viewingId, reservationId }) {
  const eligibility = await checkReviewEligibility(listingId)
  if (!eligibility.eligible && eligibility.reason !== 'offline') {
    throw new Error('Complete a viewing or stay before reviewing this property.')
  }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const row = await createReviewInDb({
        userId: user.id,
        listingId,
        rating,
        body,
        viewingId: viewingId ?? eligibility.viewingId,
        reservationId: reservationId ?? eligibility.reservationId,
      })
      if (row) return { ok: true, review: row, source: 'supabase' }
    }
  }

  const review = {
    id: `local-${Date.now()}`,
    listing_id: listingId,
    rating,
    body,
    author: 'You',
    created_at: new Date().toISOString(),
  }
  try {
    const key = `baytmiftah_reviews_${listingId}`
    const stored = JSON.parse(localStorage.getItem(key) || '[]')
    localStorage.setItem(key, JSON.stringify([review, ...stored]))
  } catch { /* ignore */ }
  return { ok: true, review, source: 'local' }
}

export default { fetchReviews, submitReview }
