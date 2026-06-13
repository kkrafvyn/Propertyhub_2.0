import { supabase, isSupabaseConfigured } from './supabase'

function mapListingRow(row) {
  if (!row) return null
  const photos = Array.isArray(row.photos) ? row.photos : []
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    type: row.type,
    listingType: row.listing_type,
    price: Number(row.price),
    priceLabel: row.price_label,
    rating: Number(row.rating || 0),
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    sqft: row.sqft,
    featured: Boolean(row.featured),
    verified: Boolean(row.verified),
    image: row.image || photos[0],
    photos: photos.length ? photos : row.image ? [row.image] : [],
    host: row.host,
    description: row.description || '',
    amenities: row.amenities || [],
    lat: row.lat,
    lng: row.lng,
  }
}

export async function fetchListingsFromDb(filters = {}) {
  if (!supabase) return null

  let query = supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false })

  if (filters.type && filters.type !== 'any') {
    query = query.eq('type', filters.type)
  }
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  const { data, error } = await query
  if (error || !data?.length) return null
  return data.map(mapListingRow).filter(Boolean)
}

export async function fetchListingByIdFromDb(id) {
  if (!supabase) return null
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapListingRow(data)
}

export async function fetchSavedIdsFromDb(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId)
  if (error) return null
  return data.map((r) => r.listing_id)
}

export async function toggleSavedInDb(userId, listingId) {
  if (!supabase || !userId) return null

  const { data: existing } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId)
    return false
  }

  const { error } = await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId })
  if (error) return null
  return true
}

export async function fetchViewingsFromDb(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('viewing_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return null
  return data.map((r) => ({
    id: r.id,
    listing_id: r.listing_id,
    preferred_date: r.preferred_date,
    guests: r.guests,
    status: r.status,
    created_at: r.created_at,
    source: 'supabase',
  }))
}

export async function fetchUserProfile(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle()
  if (error) return null
  return data
}

export async function probeBackendConnection() {
  if (!isSupabaseConfigured) {
    return { connected: false, mode: 'offline', message: 'Supabase not configured in .env' }
  }

  const { data, error } = await supabase.from('listings').select('id').eq('status', 'active').limit(1)
  if (error) {
    return { connected: false, mode: 'error', message: error.message }
  }

  return {
    connected: true,
    mode: data?.length ? 'live' : 'empty',
    message: data?.length ? 'Connected to Supabase' : 'Connected — run migrations to seed listings',
  }
}

export { mapListingRow }
