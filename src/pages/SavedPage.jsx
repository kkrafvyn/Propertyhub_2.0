import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import BackendBanner from '../components/BackendBanner'
import ListingCard, { ListingCardSkeleton } from '../components/ListingCard'
import { EmptyPanel, PageTitle } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { syncSavedIds, toggleSavedIdAsync } from '../lib/saved-listings'
import { fetchListings } from '../services/marketplace-service'

export default function SavedPage() {
  const { t } = useTranslation()
  const [savedIds, setSavedIds] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    syncSavedIds().then((ids) => {
      setSavedIds(ids)
      fetchListings().then(({ listings: rows }) => {
        setListings(rows.filter((l) => ids.includes(l.id)))
        setLoading(false)
      })
    })
  }, [])

  async function handleToggle(id) {
    const next = await toggleSavedIdAsync(id)
    setSavedIds(next)
    setListings((prev) => prev.filter((l) => next.includes(l.id)))
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <BackendBanner />
      <PageTitle title={t('savedPage.title')} subtitle={t('savedPage.subtitle')} />

      <section>
        {loading ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyPanel
            title={t('savedPage.emptyTitle')}
            description={t('savedPage.emptyDesc')}
            action={
              <Link
                to="/"
                className="inline-flex rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                {t('common.startExploring')}
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved
                onToggleSave={handleToggle}
              />
            ))}
          </div>
        )}
      </section>
    </DesktopShell>
  )
}
