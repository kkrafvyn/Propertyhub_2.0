import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import BackendBanner from '../components/BackendBanner'
import { Alert, Badge, EmptyPanel, MediaCard, PageTitle, PrimaryButton } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchUserTrips } from '../services/booking-service'
import { fetchListings } from '../services/marketplace-service'

function TripsContent() {
  const { t } = useTranslation()
  const [trips, setTrips] = useState([])
  const [listingsById, setListingsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('local')

  useEffect(() => {
    Promise.all([fetchUserTrips(), fetchListings()]).then(([{ trips: rows, source: tripSource }, { listings }]) => {
      setListingsById(Object.fromEntries(listings.map((l) => [l.id, l])))
      setTrips(rows)
      setSource(tripSource)
      setLoading(false)
    })
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <BackendBanner />
      <PageTitle title={t('tripsPage.title')} subtitle={t('tripsPage.subtitle')} />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-hover" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyPanel
          title={t('tripsPage.emptyTitle')}
          description={t('tripsPage.emptyDesc')}
          action={<PrimaryButton as={Link} to="/">{t('common.browseHomes')}</PrimaryButton>}
        />
      ) : (
        <div className="space-y-4">
          {source === 'local' && (
            <Alert>{t('tripsPage.localAlert')}</Alert>
          )}
          {trips.map((trip) => {
            const listing = listingsById[trip.listing_id]
            const guestLabel = trip.guests > 1 ? t('common.guests') : t('common.guest')
            return (
              <MediaCard
                key={trip.id}
                image={listing?.image}
                badge={<Badge tone="neutral">{trip.status}</Badge>}
                title={listing?.title || trip.listing_id}
                subtitle={`${trip.preferred_date} · ${trip.guests} ${guestLabel}`}
              />
            )
          })}
        </div>
      )}
    </DesktopShell>
  )
}

export default function TripsPage() {
  return (
    <ProtectedRoute>
      <TripsContent />
    </ProtectedRoute>
  )
}
