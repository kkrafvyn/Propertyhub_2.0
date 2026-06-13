import { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchMyListings().then(({ listings: rows, source: s }) => {
      setListings(rows)
      setSource(s)
      setLoading(false)
    })
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your listings</h1>
          <p className="mt-1 text-ink-secondary">Track review status from submission to live on marketplace.</p>
        </div>
        <Link to="/host/list" className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
          List new property
        </Link>
      </div>

      {listed && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Listing submitted for review. An agency admin will approve it for the marketplace.
        </p>
      )}

      {source === 'local' && !loading && (
        <p className="mt-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-2 text-sm text-brand-dark">
          Sign in and deploy backend to sync listing status across devices.
        </p>
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
              <div>
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-ink-secondary">{listing.location} · {listing.priceLabel || listing.price_label}</p>
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
