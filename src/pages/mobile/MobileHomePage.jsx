import { useEffect, useMemo, useState } from 'react'
import MobileShell from '../../components/MobileShell'
import MobileHomeMenu from '../../components/mobile/MobileHomeMenu'
import {
  MobileAreaCard,
  MobileCarouselSection,
  MobileHeroBanner,
  MobileHomeListingCard,
  MobilePromoCard,
  MobileReferenceHeader,
} from '../../components/mobile/MobileHomeSections'
import { neighborhoods } from '../../data/neighborhoods'
import { useTranslation } from '../../i18n/LocaleContext'
import { syncSavedIds, toggleSavedIdAsync } from '../../lib/saved-listings'
import { cacheListingsForOffline } from '../../lib/offline-cache'
import { trackFunnel } from '../../lib/analytics'
import { fetchListings } from '../../services/marketplace-service'

export default function MobileHomePage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])
  const [savedIds, setSavedIds] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => {
      const list = rows ?? []
      setListings(list)
      cacheListingsForOffline(list)
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
