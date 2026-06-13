import { callEdgeFunction } from '../lib/edge-client'
import { fetchListingsFromDb, fetchListingByIdFromDb } from '../lib/supabase-db'
import { listings as fallbackListings, getListingById as getFallbackById } from '../data/listings'

function normalizeListing(raw) {
  if (!raw) return null

  const photos = raw.photos?.length
    ? raw.photos
    : raw.media?.map((m) => m.public_url || m.url).filter(Boolean)

  return {
    id: raw.id || raw.property_id || raw.propertyId,
    title: raw.title,
    location: raw.location || raw.display_location || raw.displayLocation || raw.address,
    type: raw.type || raw.category,
    listingType: raw.listing_type || raw.listingType || 'rent',
    price: Number(raw.price || 0),
    priceLabel: raw.price_label || raw.priceLabel,
    rating: Number(raw.rating || 0),
    bedrooms: raw.bedrooms ?? 0,
    bathrooms: raw.bathrooms ?? 0,
    sqft: raw.sqft ?? raw.square_meters,
    featured: Boolean(raw.featured),
    verified: Boolean(raw.verified || raw.address_verified || raw.addressVerified),
    image: raw.image || photos?.[0] || raw.media?.[0]?.public_url,
    photos: photos?.length ? photos : raw.image ? [raw.image] : [],
    host: raw.host || raw.organization?.name || raw.organization_name || 'Verified agency',
    description: raw.description || '',
    amenities: raw.amenities || [],
    lat: raw.lat ?? raw.latitude,
    lng: raw.lng ?? raw.longitude,
    source: raw.source || 'supabase',
  }
}

export async function fetchListings(filters = {}) {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: {
        action: 'list',
        ...filters,
      },
    })

    const rows = payload?.listings ?? payload?.data ?? payload
    if (!Array.isArray(rows) || rows.length === 0) {
      const dbRows = await fetchListingsFromDb(filters)
      if (dbRows?.length) return { listings: dbRows, source: 'supabase' }
      return { listings: fallbackListings, source: 'local' }
    }

    return {
      listings: rows.map(normalizeListing).filter(Boolean),
      source: 'supabase',
    }
  } catch {
    const dbRows = await fetchListingsFromDb(filters)
    if (dbRows?.length) return { listings: dbRows, source: 'supabase' }
    return { listings: fallbackListings, source: 'local' }
  }
}

export async function fetchListingById(id) {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'get', id },
    })

    const raw = payload?.listing ?? payload?.data ?? payload
    const listing = normalizeListing(raw)

    if (!listing?.id) {
      const dbListing = await fetchListingByIdFromDb(id)
      if (dbListing) return { listing: dbListing, source: 'supabase' }
      const fallback = getFallbackById(id)
      return { listing: fallback, source: fallback ? 'local' : 'none' }
    }

    return { listing, source: 'supabase' }
  } catch {
    const dbListing = await fetchListingByIdFromDb(id)
    if (dbListing) return { listing: dbListing, source: 'supabase' }
    const fallback = getFallbackById(id)
    return { listing: fallback, source: fallback ? 'local' : 'none' }
  }
}

export default { fetchListings, fetchListingById }
