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

export async function submitReview({ listingId, rating, body, viewingId }) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const row = await createReviewInDb({
        userId: user.id,
        listingId,
        rating,
        body,
        viewingId,
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
