import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { SearchPill } from '../components/DesktopShell'
import BackendBanner from '../components/BackendBanner'
import CategoryBar from '../components/CategoryBar'
import ListingCard from '../components/ListingCard'
import { syncSavedIds, toggleSavedIdAsync } from '../lib/saved-listings'
import { syncCompareIds, toggleCompareIdAsync } from '../lib/compare-listings'
import { parseAiSearchQuery } from '../lib/ai-search'
import { fetchListings } from '../services/marketplace-service'
import { geocodeLocation } from '../services/geo-service'

const MapView = lazy(() => import('../components/MapView'))

export default function HomePage() {
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('any')
  const [aiQuery, setAiQuery] = useState('')
  const [savedIds, setSavedIds] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState('local')
  const [mapMode, setMapMode] = useState(false)
  const [mapCenter, setMapCenter] = useState([5.6037, -0.187])

  useEffect(() => {
    syncSavedIds().then(setSavedIds)
    syncCompareIds().then(setCompareIds)
  }, [])

  useEffect(() => {
    let ignore = false
    fetchListings({ type: propertyType, location }).then(({ listings: rows, source }) => {
      if (!ignore) {
        setListings(rows)
        setDataSource(source)
        setLoading(false)
      }
    })
    return () => { ignore = true }
  }, [propertyType, location])

  useEffect(() => {
    if (!location.trim()) return
    geocodeLocation(location).then((r) => {
      if (r.lat && r.lng) setMapCenter([r.lat, r.lng])
    })
  }, [location])

  const visible = useMemo(() => {
    const query = location.trim().toLowerCase()
    let filtered = listings.filter((listing) => {
      const matchesCategory =
        category === 'all' ||
        listing.type === category ||
        (category === 'verified' && listing.verified)
      const matchesType = propertyType === 'any' || listing.type === propertyType
      const haystack = `${listing.title} ${listing.location}`.toLowerCase()
      return matchesCategory && matchesType && (!query || haystack.includes(query))
    })
    if (aiQuery.trim()) filtered = parseAiSearchQuery(aiQuery, filtered)
    return filtered
  }, [listings, category, location, propertyType, aiQuery])

  const featured = useMemo(
    () => listings.filter((l) => l.featured).slice(0, 4),
    [listings],
  )

  return (
    <DesktopShell
      search={
        <SearchPill
          location={location}
          onLocationChange={setLocation}
          propertyType={propertyType}
          onTypeChange={setPropertyType}
        />
      }
      compareCount={compareIds.length}
    >
      <BackendBanner />

      <div className="mb-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">AI search</label>
        <input
          type="text"
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          placeholder='Try: "3-bedroom house in East Legon under 2000000"'
          className="mt-1 w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm shadow-sm outline-none focus:border-brand-dark"
        />
      </div>

      <CategoryBar active={category} onChange={setCategory} />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <Link to="/neighborhoods" className="text-sm font-medium text-brand-dark underline">Neighborhoods</Link>
        <Link to="/compare" className="text-sm font-medium text-brand-dark underline">
          Compare ({compareIds.length})
        </Link>
        <button
          type="button"
          onClick={() => setMapMode((v) => !v)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            mapMode ? 'border-brand-dark bg-brand-dark text-brand' : 'border-surface-border bg-surface'
          }`}
        >
          {mapMode ? 'Show list' : 'Show map'}
        </button>
      </div>

      {dataSource === 'local' && !loading && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-brand-dark">
          Sample data — deploy Edge Functions for live listings.
        </p>
      )}

      {!loading && featured.length > 0 && !mapMode && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Featured properties</h2>
            <Link to="/host/boost" className="text-sm font-medium text-brand-dark underline">Boost your listing</Link>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.includes(listing.id)}
                compared={compareIds.includes(listing.id)}
                onToggleSave={async (id) => setSavedIds(await toggleSavedIdAsync(id))}
                onToggleCompare={async (id) => setCompareIds(await toggleCompareIdAsync(id))}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        {loading ? (
          <GridSkeleton />
        ) : mapMode ? (
          <Suspense fallback={<div className="h-[520px] animate-pulse rounded-card bg-surface-hover" />}>
            <MapView listings={visible} center={mapCenter} />
          </Suspense>
        ) : visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.includes(listing.id)}
                compared={compareIds.includes(listing.id)}
                onToggleSave={async (id) => setSavedIds(await toggleSavedIdAsync(id))}
                onToggleCompare={async (id) => setCompareIds(await toggleCompareIdAsync(id))}
              />
            ))}
          </div>
        )}
      </section>
    </DesktopShell>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse aspect-[20/19] rounded-card bg-surface-hover" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-card border border-surface-border bg-surface-subtle px-8 py-16 text-center">
      <h2 className="text-xl font-semibold">No properties found</h2>
      <p className="mt-2 text-ink-secondary">Try changing your search or AI query.</p>
    </div>
  )
}
