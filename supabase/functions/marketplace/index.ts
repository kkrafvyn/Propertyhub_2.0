import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { computeReputationScore } from '../_shared/reputation.ts'
import {
  FALLBACK_SERVICES,
  FALLBACK_AGENCIES,
  FALLBACK_AGENTS,
  mapServiceRow,
  mapDirectoryRow,
} from '../_shared/marketplace-services.ts'

const FALLBACK_LISTINGS = [
  {
    id: 'cantonments-sky-villa',
    title: 'Cantonments Sky Villa',
    location: 'Cantonments, Accra',
    type: 'apartment',
    listing_type: 'rent',
    price: 125000,
    price_label: 'GHS 125,000 / month',
    rating: 4.98,
    bedrooms: 5,
    bathrooms: 4,
    sqft: 4200,
    featured: true,
    verified: true,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    ],
    host: 'Gold Coast Realty',
    description: 'Premium residence in Cantonments with concierge access and verified documentation.',
    amenities: ['Concierge', 'City view', 'Parking', '24/7 security'],
  },
]

function mapRow(row) {
  const photos = Array.isArray(row.photos) ? row.photos : []
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    type: row.type,
    listing_type: row.listing_type,
    price: row.price,
    price_label: row.price_label,
    rating: row.rating,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sqft: row.sqft,
    featured: row.featured,
    verified: row.verified,
    image: row.image || photos[0],
    photos: photos.length ? photos : row.image ? [row.image] : [],
    host: row.host,
    description: row.description,
    amenities: row.amenities ?? [],
    lat: row.lat,
    lng: row.lng,
  }
}

async function listListings(filters) {
  const admin = createAdminClient()
  let query = admin.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false })

  if (filters.type && filters.type !== 'any') {
    query = query.eq('type', filters.type)
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('listings query failed', error.message)
    return FALLBACK_LISTINGS
  }

  if (!data?.length) return FALLBACK_LISTINGS
  return data.map(mapRow)
}

async function getListing(id) {
  const admin = createAdminClient()
  const { data, error } = await admin.from('listings').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('listing query failed', error.message)
    return FALLBACK_LISTINGS.find((item) => item.id === id) ?? null
  }

  if (!data) return FALLBACK_LISTINGS.find((item) => item.id === id) ?? null
  return mapRow(data)
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const body = await req.json()

      if (body.action === 'request_service') {
        const serviceId = String(body.service_id ?? '').trim()
        if (!serviceId) return errorResponse('service_id required', 400)
        const admin = createAdminClient()
        const { data, error } = await admin.from('service_requests').insert({
          user_id: user.id,
          service_id: serviceId,
          message: body.message ?? null,
          status: 'open',
          metadata: body.metadata ?? {},
        }).select('*').single()
        if (error) return errorResponse(error.message, 500)
        return jsonResponse({ ok: true, request: data, source: 'supabase' })
      }

      if (body.action !== 'create') return errorResponse('Unsupported action', 404)

      const listing = body.listing
      const id = listing.id || `listing-${crypto.randomUUID().slice(0, 8)}`
      const admin = createAdminClient()
      const { data, error } = await admin.from('listings').insert({
        id,
        title: listing.title,
        location: listing.location,
        type: listing.type,
        listing_type: listing.listingType || listing.listing_type,
        price: listing.price,
        price_label: listing.price_label || listing.priceLabel,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.sqft,
        description: listing.description,
        status: 'pending_review',
        host: user.email,
        submitted_by: user.id,
        lat: listing.lat,
        lng: listing.lng,
        image: listing.image,
        photos: listing.photos ?? [],
      }).select('*').single()

      if (error) {
        console.error('create listing failed', error.message)
        return jsonResponse({ ok: true, listing: { ...listing, id, status: 'pending_review' }, queued: true })
      }

      await admin.from('moderation_queue').insert({
        listing_id: id,
        submitter_id: user.id,
        status: 'pending',
      })

      return jsonResponse({ ok: true, listing: mapRow(data) })
    }

    const action = url.searchParams.get('action') ?? 'list'

    if (action === 'neighborhoods') {
      const admin = createAdminClient()
      const { data } = await admin.from('neighborhoods').select('*')
      return jsonResponse({ neighborhoods: data ?? [] })
    }

    if (action === 'list') {
      const listings = await listListings({
        type: url.searchParams.get('type') ?? undefined,
        location: url.searchParams.get('location') ?? undefined,
      })
      return jsonResponse({ listings })
    }

    if (action === 'get') {
      const id = url.searchParams.get('id')
      if (!id) return errorResponse('Missing listing id')
      const listing = await getListing(id)
      if (!listing) return errorResponse('Listing not found', 404)
      return jsonResponse({ listing })
    }

    if (action === 'my_listings') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      const admin = createAdminClient()
      const { data } = await admin
        .from('listings')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })
      return jsonResponse({ listings: (data ?? []).map(mapRow), source: 'supabase' })
    }

    if (action === 'services') {
      const admin = createAdminClient()
      const { data } = await admin.from('marketplace_services').select('*').eq('active', true).order('category')
      const services = data?.length ? data.map(mapServiceRow) : FALLBACK_SERVICES
      return jsonResponse({ services, source: data?.length ? 'supabase' : 'fallback' })
    }

    if (action === 'reviews') {
      const listingId = url.searchParams.get('listing_id')
      if (!listingId) return errorResponse('listing_id required', 400)
      const admin = createAdminClient()
      const { data } = await admin.from('reviews').select('*').eq('listing_id', listingId).order('created_at', { ascending: false })
      return jsonResponse({ reviews: data ?? [], source: 'supabase' })
    }

    if (action === 'public_list') {
      const type = url.searchParams.get('type') ?? 'agency'
      const admin = createAdminClient()
      const { data } = await admin.from('directory_profiles').select('*').eq('profile_type', type)
      if (!data?.length) {
        return jsonResponse({
          agencies: type === 'agency' ? FALLBACK_AGENCIES : undefined,
          agents: type === 'agent' ? FALLBACK_AGENTS : undefined,
          source: 'fallback',
        })
      }
      const rows = await Promise.all(data.map(async (row) => {
        let trustScore = null
        if (row.user_id) {
          const rep = await computeReputationScore(admin, row.user_id).catch(() => null)
          trustScore = rep?.score ?? null
        }
        return mapDirectoryRow(row, trustScore)
      }))
      if (type === 'agent') return jsonResponse({ agents: rows, source: 'supabase' })
      return jsonResponse({ agencies: rows, source: 'supabase' })
    }

    if (action === 'public_profile') {
      const id = url.searchParams.get('id')
      const type = url.searchParams.get('type') ?? 'agency'
      if (!id) return errorResponse('id required', 400)
      const admin = createAdminClient()
      const { data: row } = await admin.from('directory_profiles').select('*').eq('id', id).eq('profile_type', type).maybeSingle()
      if (!row) {
        const fallback = type === 'agent'
          ? FALLBACK_AGENTS.find((a) => a.id === id)
          : FALLBACK_AGENCIES.find((a) => a.id === id)
        if (!fallback) return errorResponse('Profile not found', 404)
        return jsonResponse({ agency: type === 'agency' ? fallback : undefined, agent: type === 'agent' ? fallback : undefined, source: 'fallback' })
      }
      let trustScore = null
      if (row.user_id) {
        const rep = await computeReputationScore(admin, row.user_id).catch(() => null)
        trustScore = rep?.score ?? null
      }
      const mapped = mapDirectoryRow(row, trustScore)
      if (type === 'agent') return jsonResponse({ agent: mapped, reputation: trustScore != null ? { score: trustScore } : null, source: 'supabase' })
      return jsonResponse({ agency: mapped, reputation: trustScore != null ? { score: trustScore } : null, source: 'supabase' })
    }

    return errorResponse('Unsupported action', 404)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
