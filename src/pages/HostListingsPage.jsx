import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import ResponsivePageShell from '../components/ResponsivePageShell'
import { Alert, Badge, EmptyPanel, ItemCard, PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'
import { useIsMobileViewport } from '../hooks/useMediaQuery'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchMyListings } from '../services/listing-service'

const statusTone = {
  pending_review: 'warning',
  active: 'success',
  rejected: 'danger',
}

function HostListingsContent() {
  const { t } = useTranslation()
  const mobile = useIsMobileViewport()
  const location = useLocation()
  const listed = location.state?.listed
  const [listings, setListings] = useState([])
  const [source, setSource] = useState('local')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchMyListings().then(({ listings: rows, source: s }) => {
      setListings(rows)
      setSource(s)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const hasPending = listings.some((l) => l.status === 'pending_review')
    if (!hasPending) return undefined
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [listings, load])

  return (
    <ResponsivePageShell
      backTo="/host"
      titleKey="host.listings.title"
      subtitleKey="host.listings.subtitle"
      hideNav
    >
      {mobile ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <SecondaryButton onClick={load} className="w-full sm:w-auto">{t('host.listings.refresh')}</SecondaryButton>
          <PrimaryButton as={Link} to="/host/list" className="w-full sm:w-auto">{t('host.listings.listNew')}</PrimaryButton>
        </div>
      ) : (
        <PageTitle
          title={t('host.listings.title')}
          subtitle={t('host.listings.subtitle')}
          action={
            <div className="flex gap-2">
              <SecondaryButton onClick={load}>{t('host.listings.refresh')}</SecondaryButton>
              <PrimaryButton as={Link} to="/host/list">{t('host.listings.listNew')}</PrimaryButton>
            </div>
          }
        />
      )}

      {listed && (
        <Alert tone="success">{t('host.listings.submittedAlert')}</Alert>
      )}

      {source === 'local' && !loading && (
        <Alert>{t('host.listings.localAlert')}</Alert>
      )}

      {listings.some((l) => l.status === 'pending_review') && (
        <p className="mb-4 text-xs text-ink-secondary">{t('host.listings.pendingRefresh')}</p>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
        ) : listings.length === 0 ? (
          <EmptyPanel
            title={t('host.listings.emptyTitle')}
            description={t('host.listings.emptyDesc')}
            action={<PrimaryButton as={Link} to="/host/list">{t('host.listings.submitFirst')}</PrimaryButton>}
          />
        ) : (
          listings.map((listing) => (
            <ItemCard key={listing.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                {listing.image && (
                  <img src={listing.image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-semibold text-ink">{listing.title}</p>
                  <p className="text-sm text-ink-secondary">{listing.location} · {listing.priceLabel || listing.price_label}</p>
                </div>
              </div>
              <div className={`flex gap-3 ${mobile ? 'mt-3 w-full flex-col' : 'items-center'}`}>
                <Badge tone={statusTone[listing.status] || 'warning'}>
                  {(listing.status || 'pending_review').replace('_', ' ')}
                </Badge>
                <Link
                  to={`/listings/${listing.id}/schedule`}
                  state={{ backTo: '/host/listings' }}
                  className="text-sm font-semibold text-brand-accent underline"
                >
                  {t('viewingSchedule.manageSchedule')}
                </Link>
                {listing.status === 'active' && (
                  <Link to={`/property/${listing.id}`} className="text-sm font-semibold text-ink underline">
                    {t('host.listings.viewLive')}
                  </Link>
                )}
                {listing.status === 'rejected' && (
                  <Link to="/host/list" className="text-sm font-semibold text-ink underline">
                    {t('host.listings.resubmit')}
                  </Link>
                )}
              </div>
            </ItemCard>
          ))
        )}
      </section>
    </ResponsivePageShell>
  )
}

export default function HostListingsPage() {
  return <ProtectedRoute><HostListingsContent /></ProtectedRoute>
}
