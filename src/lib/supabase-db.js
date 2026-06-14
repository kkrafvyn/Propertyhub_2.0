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

export async function fetchViewingSlotsFromDb(listingId) {
  if (!supabase || !listingId) return null
  const { data, error } = await supabase
    .from('viewing_slots')
    .select('*')
    .eq('listing_id', listingId)
    .order('slot_date', { ascending: true })
  if (error) return null
  return data.map((row) => ({
    id: row.id,
    date: row.slot_date,
    time: row.slot_time,
    available: Math.max(0, (row.capacity ?? 1) - (row.booked ?? 0)),
  })).filter((slot) => slot.available > 0)
}

export async function createViewingRequestInDb({ userId, listingId, date, guests, notes }) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('viewing_requests')
    .insert({
      listing_id: listingId,
      user_id: userId,
      preferred_date: date,
      guests,
      notes: notes || null,
      status: 'pending',
    })
    .select('*')
    .single()
  if (error) return null
  return data
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

export async function upsertUserProfileFromAuth(user, metadata = {}) {
  if (!supabase || !user?.id) return null

  const role = metadata.role || user.user_metadata?.role || 'buyer'
  const displayName = metadata.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member'

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        role,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single()

  if (error) return null
  return data
}

function mapConversationRow(row, messages = []) {
  return {
    id: row.id,
    participant: row.participant_name,
    participant_name: row.participant_name,
    listingTitle: row.listing_title,
    listing_title: row.listing_title,
    listing_id: row.listing_id,
    lastMessage: row.last_message,
    last_message: row.last_message,
    unread: row.unread ?? 0,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      at: m.created_at,
    })),
  }
}

export async function fetchConversationsFromDb(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) return null
  return data.map((row) => mapConversationRow(row))
}

export async function fetchConversationFromDb(userId, conversationId) {
  if (!supabase || !userId || !conversationId) return null
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !conv) return null

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return mapConversationRow(conv, messages ?? [])
}

export async function sendMessageInDb(userId, conversationId, body) {
  if (!supabase || !userId) return null

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender: 'You', body })
    .select('*')
    .single()
  if (error) return null

  await supabase
    .from('conversations')
    .update({ last_message: body, updated_at: new Date().toISOString(), unread: 0 })
    .eq('id', conversationId)
    .eq('user_id', userId)

  return msg
}

export async function findOrCreateConversationForListing(userId, { listingId, listingTitle, participantName }) {
  if (!supabase || !userId) return null

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) return mapConversationRow(existing)

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      listing_id: listingId,
      listing_title: listingTitle,
      participant_name: participantName || 'Property host',
      last_message: '',
      unread: 0,
    })
    .select('*')
    .single()

  if (error) return null
  return mapConversationRow(conv)
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
