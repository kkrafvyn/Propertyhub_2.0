import { callEdgeFunction } from './edge-client'

const fallbackAccra = {
  source: 'local',
  results: [{ label: 'Accra', lat: 5.6037, lng: -0.187 }],
}

export async function geocodeLocation(query) {
  if (!query?.trim()) return fallbackAccra

  try {
    return await callEdgeFunction('geo', {
      query: { action: 'geocode', q: query },
      allowAnonymous: true,
    })
  } catch {
    return {
      ...fallbackAccra,
      results: [{ ...fallbackAccra.results[0], label: query }],
    }
  }
}

export default geocodeLocation
