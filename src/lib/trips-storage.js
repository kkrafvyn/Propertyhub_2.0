const STORAGE_KEY = 'baytmiftah_trips'

export function getTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addTrip(trip) {
  const trips = getTrips()
  const entry = {
    id: crypto.randomUUID(),
    status: 'pending',
    created_at: new Date().toISOString(),
    ...trip,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...trips]))
  return entry
}

export function updateTripStatus(id, status) {
  const trips = getTrips()
  const next = trips.map((t) => (t.id === id ? { ...t, status } : t))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
