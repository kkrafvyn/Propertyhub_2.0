import { useEffect, useMemo, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import {
  MobilePropertyTypeRow,
  MobileTransactionTabs,
} from '../../components/mobile/MobileHomeSections'
import {
  MobileExploreSearchRow,
  MobileLocationBar,
} from '../../components/mobile/MobileExploreLocation'
import MobileExploreFiltersSheet from '../../components/mobile/MobileExploreFiltersSheet'
import { MobileBoltListingTile, MobileEmpty } from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { cacheListingsForOffline, getCachedListings } from '../../lib/offline-cache'
import { trackFunnel } from '../../lib/analytics'
import { trackRecentSearch } from '../../lib/recent-activity'
import {
  applyExploreFilters,
  countActiveExploreFilters,
  defaultExploreFilters,
  filterToPropertyRow,
  listingTypeToTxTab,
  propertyTypeRowToFilter,
  txTabToListingType,
} from '../../lib/explore-filters'
import { enrichListingsWithDistance, formatDistanceKm, sortListingsByDistance } from '../../lib/geo-distance'
import { useUserLocation } from '../../hooks/useUserLocation'
import { fetchListings } from '../../services/marketplace-service'
import MobileExploreMap from '../../components/mobile/MobileExploreMap'

export default function MobileExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [txTab, setTxTab] = useState('stay')
  const [propType, setPropType] = useState(null)
  const [listings, setListings] = useState([])
  const [viewMode, setViewMode] = useState('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState(defaultExploreFilters)
  const userLocation = useUserLocation({ watch: false })

  useEffect(() => {
    fetchListings()
      .then(({ listings: rows }) => {
        const list = rows ?? []
        setListings(list)
        cacheListingsForOffline(list)
      })
      .catch(() => {
        const cached = getCachedListings()
        if (cached.length) setListings(cached)
      })
  }, [])

  function handleTxTabChange(tab) {
    setTxTab(tab)
    setFilters((prev) => ({
      ...prev,
      listingType: txTabToListingType(tab),
    }))
  }

  function handlePropTypeChange(type) {
    setPropType(type)
    setFilters((prev) => ({
      ...prev,
      propertyTypes: propertyTypeRowToFilter(type),
    }))
  }

  function handleApplyFilters(next) {
    setFilters(next)
    setTxTab(listingTypeToTxTab(next.listingType) || 'stay')
    setPropType(filterToPropertyRow(next.propertyTypes))
  }

  const visible = useMemo(() => {
    const effectiveFilters = {
      ...filters,
      listingType: filters.listingType || txTabToListingType(txTab),
      propertyTypes: filters.propertyTypes?.length
        ? filters.propertyTypes
        : propertyTypeRowToFilter(propType),
    }
    let filtered = applyExploreFilters(listings, effectiveFilters)
    const q = search.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((l) =>
        `${l.title} ${l.type} ${l.location || ''} ${l.area || ''}`.toLowerCase().includes(q),
      )
    }

    if (userLocation.isActive && filters.sortBy === 'recommended') {
      filtered = enrichListingsWithDistance(filtered, userLocation.lat, userLocation.lng)
      filtered = sortListingsByDistance(filtered)
    }

    return filtered.map((l) => (
      l.distanceKm != null
        ? { ...l, distanceLabel: formatDistanceKm(l.distanceKm) }
        : l
    ))
  }, [listings, filters, txTab, propType, search, userLocation.isActive, userLocation.lat, userLocation.lng])

  const activeFilterCount = countActiveExploreFilters(filters)

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
    <MobileShell showContextual={false}>
      <MobileHeader title={t('mobile.search')} />
      <MobileExploreSearchRow
        value={search}
        onChange={setSearch}
        placeholder={t('mobile.searchListings')}
        onFiltersClick={() => setFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
      />
      <MobileLocationBar
        location={userLocation}
        onRequest={userLocation.request}
        onClear={userLocation.clear}
        onRefresh={userLocation.request}
      />
      <MobileTransactionTabs active={txTab} onChange={handleTxTabChange} />
      <MobilePropertyTypeRow active={propType} onChange={handlePropTypeChange} />

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
        onApply={handleApplyFilters}
        listings={listings}
        search={search}
      />
    </MobileShell>
  )
}
