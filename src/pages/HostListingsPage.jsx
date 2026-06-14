import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { Alert, Badge, EmptyPanel, ItemCard, PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'
import { fetchMyListings } from '../services/listing-service'

const statusTone = {
  pending_review: 'warning',
  active: 'success',
  rejected: 'danger',
}

function HostListingsContent() {
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
    <DesktopShell search={<CompactSearch />}>
      <PageTitle
        title="Your listings"
        subtitle="Track review status from submission to live on marketplace."
        action={
          <div className="flex gap-2">
            <SecondaryButton onClick={load}>Refresh</SecondaryButton>
            <PrimaryButton as={Link} to="/host/list">List new property</PrimaryButton>
          </div>
        }
      />

      {listed && (
        <Alert tone="success">Listing submitted for review. An agency admin will approve it for the marketplace.</Alert>
      )}

      {source === 'local' && !loading && (
        <Alert>Sign in and run migrations to sync listing status across devices.</Alert>
      )}

      {listings.some((l) => l.status === 'pending_review') && (
        <p className="mb-4 text-xs text-ink-secondary">Pending listings auto-refresh every 30 seconds.</p>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
        ) : listings.length === 0 ? (
          <EmptyPanel
            title="No listings yet"
            description="Submit your first property to reach buyers and renters."
            action={<PrimaryButton as={Link} to="/host/list">Submit your first property</PrimaryButton>}
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
              <div className="flex items-center gap-3">
                <Badge tone={statusTone[listing.status] || 'warning'}>
                  {(listing.status || 'pending_review').replace('_', ' ')}
                </Badge>
                {listing.status === 'active' && (
                  <Link to={`/property/${listing.id}`} className="text-sm font-semibold text-ink underline">
                    View live
                  </Link>
                )}
                {listing.status === 'rejected' && (
                  <Link to="/host/list" className="text-sm font-semibold text-ink underline">
                    Resubmit
                  </Link>
                )}
              </div>
            </ItemCard>
          ))
        )}
      </section>
    </DesktopShell>
  )
}

export default function HostListingsPage() {
  return <ProtectedRoute><HostListingsContent /></ProtectedRoute>
}
