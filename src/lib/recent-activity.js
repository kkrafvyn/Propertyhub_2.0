const SEARCH_KEY = 'bm_recent_searches'
const VIEWED_KEY = 'bm_recently_viewed'
const MAX = 8

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function write(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows.slice(0, MAX)))
}

export function trackRecentSearch(query) {
  const text = String(query || '').trim()
  if (!text) return
  const rows = read(SEARCH_KEY).filter((r) => r.query !== text)
  rows.unshift({ query: text, at: Date.now() })
  write(SEARCH_KEY, rows)
}

export function getRecentSearches() {
  return read(SEARCH_KEY)
}

export function trackRecentlyViewed(listing) {
  if (!listing?.id) return
  const rows = read(VIEWED_KEY).filter((r) => r.id !== listing.id)
  rows.unshift({
    id: listing.id,
    title: listing.title,
    location: listing.location,
    priceLabel: listing.priceLabel,
    image: listing.photos?.[0] || listing.image,
    at: Date.now(),
  })
  write(VIEWED_KEY, rows)
}

export function getRecentlyViewed() {
  return read(VIEWED_KEY)
}
