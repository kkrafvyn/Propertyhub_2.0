import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

const NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  cantonments: { lat: 5.556, lng: -0.182 },
  airport: { lat: 5.605, lng: -0.168 },
  'east legon': { lat: 5.635, lng: -0.15 },
  osu: { lat: 5.555, lng: -0.176 },
  labone: { lat: 5.565, lng: -0.175 },
  ridge: { lat: 5.57, lng: -0.195 },
  accra: { lat: 5.6037, lng: -0.187 },
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').toLowerCase()

  for (const [key, coords] of Object.entries(NEIGHBORHOODS)) {
    if (q.includes(key)) {
      return jsonResponse({ ...coords, label: key, source: 'edge' })
    }
  }

  return jsonResponse({ lat: 5.6037, lng: -0.187, label: 'Accra', source: 'edge' })
})
