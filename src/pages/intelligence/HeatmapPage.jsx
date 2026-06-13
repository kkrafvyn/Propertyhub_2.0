import { lazy, Suspense, useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchHeatmap } from '../../services/intelligence-service'

const MapView = lazy(() => import('../../components/MapView'))

function Heatmap() {
  const [zones, setZones] = useState([])

  useEffect(() => {
    fetchHeatmap().then(({ zones: z }) => setZones(z))
  }, [])

  const listings = zones.map((z) => ({
    id: z.id,
    title: z.name,
    location: z.name,
    priceLabel: `GHS ${(z.avgPrice / 1000000).toFixed(1)}M avg`,
    lat: z.lat,
    lng: z.lng,
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80',
    featured: z.intensity > 0.85,
  }))

  return (
    <IntelligenceShell title="Price heatmap" subtitle="Demand intensity across Accra metro">
      <Suspense fallback={<div className="h-[480px] animate-pulse rounded-card bg-surface-hover" />}>
        <MapView listings={listings} center={[5.6037, -0.187]} />
      </Suspense>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
          <article key={z.id} className="rounded-card border border-surface-border bg-surface p-4">
            <p className="font-semibold">{z.name}</p>
            <p className="text-sm text-brand-dark">GHS {z.avgPrice.toLocaleString()} · {z.growth}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${z.intensity * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </IntelligenceShell>
  )
}

export default function HeatmapPage() {
  return <ProtectedRoute><Heatmap /></ProtectedRoute>
}
