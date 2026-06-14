import { useEffect, useMemo, useState } from 'react'
import MobileShell, { MobileHeader, MobileSearchBar } from '../../components/MobileShell'
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
  MobileBoltListingCard,
  MobileBoltListingTile,
  MobileEmpty,
} from '../../components/ui/MobileUI'
import { neighborhoods } from '../../data/neighborhoods'
import { useTranslation } from '../../i18n/LocaleContext'
import { syncSavedIds, toggleSavedIdAsync } from '../../lib/saved-listings'
import { fetchListings } from '../../services/marketplace-service'

export default function MobileHomePage() {
  const { t } = useTranslation()
  const [txTab, setTxTab] = useState('stay')
  const [propType, setPropType] = useState(null)
  const [listings, setListings] = useState([])
  const [savedIds, setSavedIds] = useState([])

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
    syncSavedIds().then(setSavedIds)
  }, [])

  const filtered = useMemo(
    () => filterHomeListings(listings, txTab, propType),
    [listings, txTab, propType],
  )

  const weekend = useMemo(() => filtered.slice(0, 6), [filtered])
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
    { title: t('mobile.homeScreen.bookTomorrow'), to: '/m/explore' },
    { title: t('mobile.homeScreen.instantDeals'), to: '/m/explore' },
    { title: t('mobile.homeScreen.weekendEscapes'), to: '/m/explore' },
  ]

  async function handleToggleSave(id) {
    setSavedIds(await toggleSavedIdAsync(id))
  }

  return (
    <MobileShell>
      <MobileReferenceHeader />
      <MobileHeroBanner />
      <MobileTransactionTabs active={txTab} onChange={setTxTab} />
      <MobilePropertyTypeRow active={propType} onChange={setPropType} />

      {weekend.length > 0 && (
        <MobileCarouselSection title={t('mobile.homeScreen.availableWeekend')} seeAllTo="/m/explore">
          {weekend.map((listing, i) => (
            <MobileHomeListingCard
              key={listing.id}
              listing={listing}
              to={`/m/property/${listing.id}`}
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

      <MobileCarouselSection title={t('mobile.homeScreen.lastMinute')} seeAllTo="/m/explore">
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
        <MobileCarouselSection title={t('mobile.homeScreen.featuredHomes')} seeAllTo="/m/explore">
          {featured.map((listing) => (
            <MobileHomeListingCard
              key={listing.id}
              listing={listing}
              to={`/m/property/${listing.id}`}
              saved={savedIds.includes(listing.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </MobileCarouselSection>
      )}

      {filtered.length === 0 && (
        <div className="px-4 pb-6">
          <MobileEmpty title={t('home.noMatches')} description={t('home.tryAdjusting')} />
        </div>
      )}
    </MobileShell>
  )
}

export function MobileExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  const visible = listings.filter((l) =>
    !search || `${l.title} ${l.type}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.search')} subtitle={t('mobile.findNextHome')} backTo="/m" />
      <MobileSearchBar value={search} onChange={setSearch} placeholder={t('mobile.searchListings')} />
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {visible.map((listing) => (
          <MobileBoltListingTile key={listing.id} listing={listing} to={`/m/property/${listing.id}`} />
        ))}
      </div>
    </MobileShell>
  )
}

export function MobileSavedPage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => {
      fetchListings().then(({ listings: rows }) => setListings(rows.filter((l) => ids.includes(l.id))))
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
            <MobileBoltListingCard key={listing.id} listing={listing} to={`/m/property/${listing.id}`} />
          ))
        )}
      </div>
    </MobileShell>
  )
}
