import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { mapListingRow } from '../lib/supabase-db'

export async function createListing(payload) {
  try {
    const result = await callEdgeFunction('marketplace', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'create', listing: payload },
    })
    if (result?.listing || result?.ok) return { ...result, source: 'supabase' }
  } catch { /* try direct */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const id = payload.id || `listing-${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        title: payload.title,
        location: payload.location,
        type: payload.type,
        listing_type: payload.listingType || payload.listing_type,
        price: payload.price,
        price_label: payload.price_label || payload.priceLabel,
        bedrooms: payload.bedrooms ?? 0,
        bathrooms: payload.bathrooms ?? 0,
        sqft: payload.sqft,
        description: payload.description ?? '',
        status: 'pending_review',
        host: user.email,
        submitted_by: user.id,
        image: payload.image,
        photos: payload.photos ?? [],
        amenities: payload.amenities ?? [],
      }
      const { data, error } = await supabase.from('listings').insert(row).select('*').single()
      if (!error) {
        await supabase.from('moderation_queue').insert({
          listing_id: id,
          submitter_id: user.id,
          status: 'pending',
        })
        return { ok: true, listing: mapListingRow(data), source: 'supabase' }
      }
    }
  }

  const drafts = JSON.parse(localStorage.getItem('baytmiftah_listing_drafts') || '[]')
  const entry = { ...payload, id: payload.id || `draft-${Date.now()}`, status: 'pending_review', source: 'local' }
  localStorage.setItem('baytmiftah_listing_drafts', JSON.stringify([entry, ...drafts]))
  return { ok: true, listing: entry, source: 'local' }
}

export async function fetchMyListings() {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: false,
      query: { action: 'my_listings' },
    })
    if (payload?.listings) return { listings: payload.listings, source: 'supabase' }
  } catch { /* direct */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })
      if (data?.length) {
        return { listings: data.map(mapListingRow), source: 'supabase' }
      }
    }
  }

  const drafts = JSON.parse(localStorage.getItem('baytmiftah_listing_drafts') || '[]')
  return { listings: drafts, source: 'local' }
}

export default { createListing, fetchMyListings }
