import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { fetchMyListings } from '../services/listing-service'

const statusStyle = {
  pending_review: 'bg-brand-light text-brand-dark',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your listings</h1>
          <p className="mt-1 text-ink-secondary">Track review status from submission to live on marketplace.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-surface-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-subtle"
          >
            Refresh
          </button>
          <Link to="/host/list" className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
            List new property
          </Link>
        </div>
      </div>

      {listed && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Listing submitted for review. An agency admin will approve it for the marketplace.
        </p>
      )}

      {source === 'local' && !loading && (
        <p className="mt-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-brand-dark">
          Sign in and run migrations to sync listing status across devices. Use <code className="text-xs">npm run db:apply</code>.
        </p>
      )}

      {listings.some((l) => l.status === 'pending_review') && (
        <p className="mt-4 text-xs text-ink-secondary">Pending listings auto-refresh every 30 seconds.</p>
      )}

      <section className="mt-8 space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse rounded-card bg-surface-hover" />
        ) : listings.length === 0 ? (
          <div className="rounded-card border border-surface-border bg-surface-subtle px-8 py-12 text-center">
            <p className="text-ink-secondary">No listings yet.</p>
            <Link to="/host/list" className="mt-4 inline-block text-sm font-semibold text-brand-dark underline">
              Submit your first property
            </Link>
          </div>
        ) : (
          listings.map((listing) => (
            <article key={listing.id} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-surface-border p-4">
              <div className="flex min-w-0 items-center gap-4">
                {listing.image && (
                  <img src={listing.image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-semibold">{listing.title}</p>
                  <p className="text-sm text-ink-secondary">{listing.location} · {listing.priceLabel || listing.price_label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle[listing.status] || statusStyle.pending_review}`}>
                  {(listing.status || 'pending_review').replace('_', ' ')}
                </span>
                {listing.status === 'active' && (
                  <Link to={`/property/${listing.id}`} className="text-sm font-semibold text-brand-dark underline">
                    View live
                  </Link>
                )}
                {listing.status === 'rejected' && (
                  <Link to="/host/list" className="text-sm font-semibold text-brand-dark underline">
                    Resubmit
                  </Link>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </DesktopShell>
  )
}

export default function HostListingsPage() {
  return <ProtectedRoute><HostListingsContent /></ProtectedRoute>
}
