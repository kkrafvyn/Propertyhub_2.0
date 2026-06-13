import { callEdgeFunction } from '../lib/edge-client'

export async function fetchNeighborhoods() {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'neighborhoods' },
    })
    if (payload?.neighborhoods?.length) {
      return {
        neighborhoods: payload.neighborhoods.map(mapNeighborhood),
        source: 'supabase',
      }
    }
  } catch { /* fallback */ }

  const { neighborhoods } = await import('../data/neighborhoods')
  return { neighborhoods, source: 'local' }
}

function mapNeighborhood(row) {
  const highlights = Array.isArray(row.highlights) ? row.highlights : []
  return {
    slug: row.id,
    name: row.name,
    summary: row.summary,
    growth: row.growth_pct,
    score: Math.min(95, Math.round(Number(row.median_price) / 50000)),
    schools: highlights.includes('Top schools') ? 4.5 : 4,
    safety: 4.2,
    healthcare: 4,
    infrastructure: 4.3,
    highlights,
    lat: row.lat,
    lng: row.lng,
  }
}

export async function fetchNeighborhood(slug) {
  const { neighborhoods } = await fetchNeighborhoods()
  return neighborhoods.find((n) => n.slug === slug) ?? null
}

export default { fetchNeighborhoods, fetchNeighborhood }
