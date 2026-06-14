import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { SearchPill } from '../components/DesktopShell'
import BackendBanner from '../components/BackendBanner'
import CategoryBar from '../components/CategoryBar'
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard'
import { IconChevronLeft, IconChevronRight } from '../components/icons'
import { useTranslation } from '../i18n/LocaleContext'
import { syncSavedIds, toggleSavedIdAsync } from '../lib/saved-listings'
import { syncCompareIds, toggleCompareIdAsync } from '../lib/compare-listings'
import { parseAiSearchQuery } from '../lib/ai-search'
import { fetchListings } from '../services/marketplace-service'
import { geocodeLocation } from '../services/geo-service'

const MapView = lazy(() => import('../components/MapView'))

export default function HomePage() {
  const { t } = useTranslation()
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('any')
  const [budget, setBudget] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
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
      const matchesBudget = !budget.trim() || haystack.includes(budget.toLowerCase()) || listing.priceLabel?.includes(budget)
      return matchesCategory && matchesType && matchesBudget && (!query || haystack.includes(query))
    })
    if (aiQuery.trim()) filtered = parseAiSearchQuery(aiQuery, filtered)
    return filtered
  }, [listings, category, location, propertyType, budget, aiQuery])

  const featured = useMemo(
    () => listings.filter((l) => l.featured).slice(0, 12),
    [listings],
  )

  const cardProps = {
    savedIds,
    compareIds,
    onToggleSave: async (id) => setSavedIds(await toggleSavedIdAsync(id)),
    onToggleCompare: async (id) => setCompareIds(await toggleCompareIdAsync(id)),
  }

  return (
    <DesktopShell
      compareCount={compareIds.length}
      search={
        <SearchPill
          location={location}
          onLocationChange={setLocation}
          propertyType={propertyType}
          onTypeChange={setPropertyType}
          budget={budget}
          onBudgetChange={setBudget}
        />
      }
      categoryBar={
        <CategoryBar
          active={category}
          onChange={setCategory}
          onFiltersClick={() => setFiltersOpen(true)}
          mapMode={mapMode}
          onToggleMap={() => setMapMode((v) => !v)}
        />
      }
    >
      <BackendBanner />

      {filtersOpen && (
        <FiltersPanel
          aiQuery={aiQuery}
          onAiQueryChange={setAiQuery}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {dataSource === 'local' && !loading && (
        <p className="mb-6 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-secondary">
          {t('home.sampleListings')}
        </p>
      )}

      {mapMode ? (
        <Suspense fallback={<div className="h-[calc(100vh-220px)] animate-pulse rounded-listing bg-surface-hover" />}>
          <MapView listings={visible} center={mapCenter} />
        </Suspense>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <ListingCarousel
              title={t('home.popularInAccra')}
              listings={featured}
              {...cardProps}
            />
          )}

          <section className={featured.length > 0 ? 'mt-12' : ''}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-heading">
                {location.trim() ? t('home.homesIn', { location }) : t('home.exploreHomes')}
              </h2>
              <Link to="/neighborhoods" className="flex items-center gap-1 text-sm font-semibold underline">
                {t('home.viewNeighborhoods')}
                <IconChevronRight className="h-4 w-4 rtl-flip" />
              </Link>
            </div>

            {visible.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visible.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved={cardProps.savedIds.includes(listing.id)}
                    compared={cardProps.compareIds.includes(listing.id)}
                    onToggleSave={cardProps.onToggleSave}
                    onToggleCompare={cardProps.onToggleCompare}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </DesktopShell>
  )
}

function ListingCarousel({ title, listings, savedIds, compareIds, onToggleSave, onToggleCompare }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)

  function scrollBy(direction) {
    scrollRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="section-heading">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border bg-surface transition hover:shadow-search"
            aria-label={t('home.scrollLeft')}
          >
            <IconChevronLeft className="h-4 w-4 rtl-flip" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border bg-surface transition hover:shadow-search"
            aria-label={t('home.scrollRight')}
          >
            <IconChevronRight className="h-4 w-4 rtl-flip" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="listing-scroll">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            compact
            saved={savedIds.includes(listing.id)}
            compared={compareIds.includes(listing.id)}
            onToggleSave={onToggleSave}
            onToggleCompare={onToggleCompare}
          />
        ))}
      </div>
    </section>
  )
}

function FiltersPanel({ aiQuery, onAiQueryChange, onClose }) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('home.filters')}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface-hover" aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink">{t('home.aiSearch')}</span>
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => onAiQueryChange(e.target.value)}
            placeholder={t('home.aiPlaceholder')}
            className="w-full rounded-xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-ink"
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t('home.showResults')}
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl border border-surface-border px-8 py-16 text-center">
      <h2 className="text-xl font-semibold">{t('home.noMatches')}</h2>
      <p className="mt-2 text-ink-secondary">{t('home.tryAdjusting')}</p>
    </div>
  )
}
