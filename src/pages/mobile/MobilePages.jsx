import { useEffect, useMemo, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import { useAuth } from '../../context/AuthContext'
import MobileHomeMenu from '../../components/mobile/MobileHomeMenu'
import {
  MobileAreaCard,
  MobileCarouselSection,
  MobileHeroBanner,
  MobileHomeListingCard,
  MobilePromoCard,
  MobilePropertyTypeRow,
  MobileReferenceHeader,
  MobileTransactionTabs,
  filterHomeListings,
} from '../../components/mobile/MobileHomeSections'
import {
  MobileExploreFiltersSheet,
  MobileExploreSearchRow,
  MobileLocationBar,
} from '../../components/mobile/MobileExploreLocation'
import {
  MobileBoltListingCard,
  MobileBoltListingTile,
  MobileEmpty,
} from '../../components/ui/MobileUI'
import { neighborhoods } from '../../data/neighborhoods'
import { useTranslation } from '../../i18n/LocaleContext'
import { syncSavedIds, toggleSavedIdAsync } from '../../lib/saved-listings'
import { cacheListingsForOffline, getCachedListings } from '../../lib/offline-cache'
import { trackFunnel } from '../../lib/analytics'
import { trackRecentSearch } from '../../lib/recent-activity'
import { enrichListingsWithDistance, formatDistanceKm, sortListingsByDistance } from '../../lib/geo-distance'
import { useUserLocation } from '../../hooks/useUserLocation'
import { fetchListings } from '../../services/marketplace-service'
import MobileExploreMap from '../../components/mobile/MobileExploreMap'

export default function MobileHomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [savedIds, setSavedIds] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => {
      setListings(rows)
      cacheListingsForOffline(rows)
    })
    syncSavedIds().then(setSavedIds)
  }, [])

  const weekend = useMemo(() => listings.slice(0, 6), [listings])
  const featured = useMemo(() => listings.filter((l) => l.featured).slice(0, 6), [listings])

  const areas = useMemo(
    () =>
      neighborhoods.map((area) => ({
        area,
        count: listings.filter((l) =>
          l.location?.toLowerCase().includes(area.name.toLowerCase()),
        ).length,
      })),
    [listings],
  )

  const promos = [
    { title: t('mobile.homeScreen.bookTomorrow'), to: '/explore' },
    { title: t('mobile.homeScreen.instantDeals'), to: '/explore' },
    { title: t('mobile.homeScreen.weekendEscapes'), to: '/explore' },
  ]

  async function handleToggleSave(id) {
    const wasSaved = savedIds.includes(id)
    setSavedIds(await toggleSavedIdAsync(id))
    trackFunnel(wasSaved ? 'listing_unsaved' : 'listing_saved', { listing_id: id })
  }

  return (
    <MobileShell showContextual={false}>
      <MobileReferenceHeader
        menuEnabled
        onMenuClick={() => setMenuOpen(true)}
      />
      <MobileHomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobileHeroBanner />

      {weekend.length > 0 && (
        <MobileCarouselSection title={t('mobile.homeScreen.availableWeekend')} seeAllTo="/explore">
          {weekend.map((listing, i) => (
            <MobileHomeListingCard
              key={listing.id}
              listing={listing}
              to={`/property/${listing.id}`}
              badge={{
                label: i % 2 === 0 ? t('mobile.homeScreen.badgeWeekend') : t('mobile.homeScreen.badgeNights'),
                tone: i % 2 === 0 ? 'green' : 'blue',
              }}
              saved={savedIds.includes(listing.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </MobileCarouselSection>
      )}

      <MobileCarouselSection title={t('mobile.homeScreen.lastMinute')} seeAllTo="/explore">
        {promos.map((promo, i) => (
          <MobilePromoCard
            key={promo.title}
            title={promo.title}
            subtitle={t('mobile.homeScreen.exploreStays')}
            to={promo.to}
            index={i}
          />
        ))}
      </MobileCarouselSection>

      <MobileCarouselSection title={t('mobile.homeScreen.popularAreas')} seeAllTo="/neighborhoods">
        {areas.map(({ area, count }) => (
          <MobileAreaCard
            key={area.slug}
            area={area}
            count={count || listings.length}
            to={`/neighborhoods/${area.slug}`}
          />
        ))}
      </MobileCarouselSection>

      {featured.length > 0 && (
        <MobileCarouselSection title={t('mobile.homeScreen.featuredHomes')} seeAllTo="/explore">
          {featured.map((listing) => (
            <MobileHomeListingCard
              key={listing.id}
              listing={listing}
              to={`/property/${listing.id}`}
              saved={savedIds.includes(listing.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </MobileCarouselSection>
      )}
    </MobileShell>
  )
}

export function MobileExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [txTab, setTxTab] = useState('stay')
  const [propType, setPropType] = useState(null)
  const [listings, setListings] = useState([])
  const [viewMode, setViewMode] = useState('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({ verifiedOnly: false, minBedrooms: 0 })
  const userLocation = useUserLocation({ watch: false })

  useEffect(() => {
    fetchListings()
      .then(({ listings: rows }) => {
        setListings(rows)
        cacheListingsForOffline(rows)
      })
      .catch(() => {
        const cached = getCachedListings()
        if (cached.length) setListings(cached)
      })
  }, [])

  const visible = useMemo(() => {
    let filtered = filterHomeListings(listings, txTab, propType)
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((l) =>
        `${l.title} ${l.type} ${l.location || ''}`.toLowerCase().includes(q),
      )
    }
    if (filters.verifiedOnly) filtered = filtered.filter((l) => l.verified)
    if (filters.minBedrooms > 0) filtered = filtered.filter((l) => (l.bedrooms ?? 0) >= filters.minBedrooms)

    if (userLocation.isActive) {
      filtered = enrichListingsWithDistance(filtered, userLocation.lat, userLocation.lng)
      filtered = sortListingsByDistance(filtered)
    }

    return filtered.map((l) => (
      l.distanceKm != null
        ? { ...l, distanceLabel: formatDistanceKm(l.distanceKm) }
        : l
    ))
  }, [listings, txTab, propType, search, filters, userLocation.isActive, userLocation.lat, userLocation.lng])

  useEffect(() => {
    const q = search.trim()
    if (q.length >= 2) {
      const timer = setTimeout(() => {
        trackRecentSearch(q)
        trackFunnel('search', { query: q, results: visible.length, near_me: userLocation.isActive })
      }, 400)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [search, visible.length, userLocation.isActive])

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.search')} subtitle={t('mobile.findNextHome')} />
      <MobileExploreSearchRow
        value={search}
        onChange={setSearch}
        placeholder={t('mobile.searchListings')}
        onFiltersClick={() => setFiltersOpen(true)}
      />
      <MobileLocationBar
        location={userLocation}
        onRequest={userLocation.request}
        onClear={userLocation.clear}
        onRefresh={userLocation.request}
      />
      <MobileTransactionTabs active={txTab} onChange={setTxTab} />
      <MobilePropertyTypeRow active={propType} onChange={setPropType} />

      <div className="mb-3 flex gap-2 px-3 sm:px-4">
        {['list', 'map'].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              viewMode === mode
                ? 'bg-mobile-forest text-white'
                : 'bg-[#F5F5F5] text-ink-secondary'
            }`}
          >
            {mode === 'list' ? t('mobile.viewList') : t('mobile.viewMap')}
          </button>
        ))}
      </div>

      {viewMode === 'map' ? (
        visible.length === 0 ? (
          <div className="px-4 pb-4">
            <MobileEmpty title={t('home.noMatches')} description={t('home.tryAdjusting')} />
          </div>
        ) : (
          <MobileExploreMap
            listings={visible}
            userLocation={userLocation.isActive ? userLocation : null}
          />
        )
      ) : visible.length === 0 ? (
        <div className="px-4 pb-4">
          <MobileEmpty title={t('home.noMatches')} description={t('home.tryAdjusting')} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-3 pb-4 md:grid-cols-3 md:gap-3 sm:gap-3 sm:px-4">
          {visible.map((listing) => (
            <MobileBoltListingTile key={listing.id} listing={listing} to={`/property/${listing.id}`} />
          ))}
        </div>
      )}

      <MobileExploreFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </MobileShell>
  )
}

export function MobileSavedPage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => {
      fetchListings()
        .then(({ listings: rows }) => setListings(rows.filter((l) => ids.includes(l.id))))
        .catch(() => {
          const cached = getCachedListings()
          setListings(cached.filter((l) => ids.includes(l.id)))
        })
    })
  }, [])

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.saved')} subtitle={t('mobile.savedCount', { count: listings.length })} />
      <div className="space-y-3 px-4 pb-4">
        {listings.length === 0 ? (
          <MobileEmpty title={t('mobile.noSavedTitle')} description={t('mobile.noSavedDesc')} />
        ) : (
          listings.map((listing) => (
            <MobileBoltListingCard key={listing.id} listing={listing} to={`/property/${listing.id}`} />
          ))
        )}
      </div>
    </MobileShell>
  )
}
