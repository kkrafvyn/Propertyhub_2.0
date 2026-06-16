import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import { MobileBoltListingCard, MobileEmpty } from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { syncSavedIds } from '../../lib/saved-listings'
import { getCachedListings } from '../../lib/offline-cache'
import { fetchListings } from '../../services/marketplace-service'

export default function MobileSavedPage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => {
      fetchListings()
        .then(({ listings: rows }) => setListings((rows ?? []).filter((l) => ids.includes(l.id))))
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
