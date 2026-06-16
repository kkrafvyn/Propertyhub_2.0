const ACCRA_CENTER = { lat: 5.6037, lng: -0.187 }

/** Neighborhood centroids for listings missing lat/lng */
export const NEIGHBORHOOD_COORDS = {
  cantonments: { lat: 5.556, lng: -0.182 },
  airport: { lat: 5.605, lng: -0.168 },
  'airport residential': { lat: 5.605, lng: -0.168 },
  'east legon': { lat: 5.635, lng: -0.15 },
  osu: { lat: 5.555, lng: -0.176 },
  labone: { lat: 5.565, lng: -0.175 },
  ridge: { lat: 5.57, lng: -0.195 },
  tema: { lat: 5.669, lng: -0.017 },
  accra: ACCRA_CENTER,
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistanceKm(km) {
  if (km == null || Number.isNaN(km)) return null
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function coordsFromLocation(location) {
  if (!location) return null
  const normalized = location.toLowerCase()
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (normalized.includes(key)) return coords
  }
  return null
}

export function getListingCoords(listing) {
  if (listing?.lat != null && listing?.lng != null) {
    return { lat: Number(listing.lat), lng: Number(listing.lng) }
  }
  return coordsFromLocation(listing?.location)
}

export function distanceToListing(userLat, userLng, listing) {
  const coords = getListingCoords(listing)
  if (!coords || userLat == null || userLng == null) return null
  return haversineKm(userLat, userLng, coords.lat, coords.lng)
}

export function enrichListingsWithDistance(listings, userLat, userLng) {
  if (userLat == null || userLng == null) return listings
  return listings.map((listing) => {
    const distanceKm = distanceToListing(userLat, userLng, listing)
    return distanceKm == null ? listing : { ...listing, distanceKm }
  })
}

export function sortListingsByDistance(listings) {
  return [...listings].sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })
}

export function nearestNeighborhoodLabel(lat, lng) {
  let best = null
  let bestKm = Infinity
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    const km = haversineKm(lat, lng, coords.lat, coords.lng)
    if (km < bestKm) {
      bestKm = km
      best = name
    }
  }
  if (!best || bestKm > 8) return null
  return best.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
