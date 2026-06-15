const LISTINGS_KEY = 'baytmiftah_listings_cache'

export function cacheListingsForOffline(listings) {
  if (!listings?.length) return
  try {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify({ at: Date.now(), listings }))
  } catch {
    /* quota */
  }

  const urls = [
    ...new Set(
      listings
        .flatMap((l) => [l.image, ...(l.photos || [])])
        .filter((u) => typeof u === 'string' && u.startsWith('http')),
    ),
  ].slice(0, 48)

  if (urls.length && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_URLS', urls })
  }
}

export function getCachedListings() {
  try {
    const raw = JSON.parse(localStorage.getItem(LISTINGS_KEY) || '{}')
    return raw.listings ?? []
  } catch {
    return []
  }
}

export function cacheSavedIds(ids) {
  try {
    localStorage.setItem('baytmiftah_saved', JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}
