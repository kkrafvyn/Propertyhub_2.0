import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { MobileEmpty, MobilePrimaryButton, MobileBadge } from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { cancelViewing, fetchUserTrips } from '../../services/booking-service'
import { fetchListings } from '../../services/marketplace-service'
import { trackFunnel } from '../../lib/analytics'

const statusTone = {
  pending: 'neutral',
  confirmed: 'accent',
  cancelled: 'neutral',
  completed: 'accent',
}

function TripsContent() {
  const { t } = useTranslation()
  const [trips, setTrips] = useState([])
  const [listingsById, setListingsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    Promise.all([fetchUserTrips(), fetchListings()]).then(([{ trips: rows }, { listings }]) => {
      setListingsById(Object.fromEntries(listings.map((l) => [l.id, l])))
      setTrips(rows)
      setLoading(false)
    })
  }, [])

  async function handleCancel(tripId) {
    setBusyId(tripId)
    await cancelViewing(tripId)
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: 'cancelled' } : t)))
    trackFunnel('viewing_cancelled', { trip_id: tripId })
    setBusyId(null)
  }

  return (
    <MobileShell>
      <MobileHeader title={t('tripsPage.title')} subtitle={t('tripsPage.subtitle')} />
      {loading ? (
        <div className="space-y-3 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-hover" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="px-4 pb-4">
          <MobileEmpty title={t('tripsPage.emptyTitle')} description={t('tripsPage.emptyDesc')} />
          <MobilePrimaryButton as={Link} to="/explore" className="mt-4 block text-center">
            {t('common.browseHomes')}
          </MobilePrimaryButton>
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-6">
          {trips.map((trip) => {
            const listing = listingsById[trip.listing_id]
            const canCancel = trip.status === 'pending' || trip.status === 'confirmed'
            return (
              <article key={trip.id} className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm">
                <Link to={`/property/${trip.listing_id}`} className="flex gap-3 p-3">
                  {listing?.image && (
                    <img src={listing.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{listing?.title || trip.listing_id}</p>
                    <p className="text-sm text-ink-secondary">
                      {trip.preferred_date} · {trip.guests} {trip.guests > 1 ? t('common.guests') : t('common.guest')}
                    </p>
                    <MobileBadge tone={statusTone[trip.status] || 'neutral'}>
                      <span className="capitalize">{trip.status?.replace('_', ' ')}</span>
                    </MobileBadge>
                  </div>
                </Link>
                {canCancel && (
                  <div className="border-t border-surface-border px-3 py-2">
                    <button
                      type="button"
                      disabled={busyId === trip.id}
                      onClick={() => handleCancel(trip.id)}
                      className="text-sm font-semibold text-red-600 disabled:opacity-60"
                    >
                      {busyId === trip.id ? t('mobile.tripsCancelling') : t('mobile.tripsCancel')}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </MobileShell>
  )
}

export default function MobileTripsPage() {
  return (
    <ProtectedRoute>
      <TripsContent />
    </ProtectedRoute>
  )
}
