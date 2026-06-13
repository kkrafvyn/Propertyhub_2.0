import { callEdgeFunction } from '../lib/edge-client'

const ACCRA_CENTER = { lat: 5.6037, lng: -0.187 }

export async function geocodeLocation(query) {
  try {
    const payload = await callEdgeFunction('geo', {
      allowAnonymous: true,
      query: { action: 'geocode', q: query },
    })
    if (payload?.lat && payload?.lng) {
      return { ...payload, source: 'supabase' }
    }
  } catch {
    /* fallback */
  }

  const normalized = query.toLowerCase()
  const neighborhoods = {
    cantonments: { lat: 5.556, lng: -0.182 },
    airport: { lat: 5.605, lng: -0.168 },
    'east legon': { lat: 5.635, lng: -0.15 },
    osu: { lat: 5.555, lng: -0.176 },
    labone: { lat: 5.565, lng: -0.175 },
    ridge: { lat: 5.57, lng: -0.195 },
    accra: ACCRA_CENTER,
  }

  for (const [key, coords] of Object.entries(neighborhoods)) {
    if (normalized.includes(key)) return { ...coords, label: key, source: 'local' }
  }

  return { ...ACCRA_CENTER, label: 'Accra', source: 'local' }
}

export default { geocodeLocation }
