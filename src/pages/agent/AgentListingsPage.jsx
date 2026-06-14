import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchMyListings } from '../../services/listing-service'

function Listings() {
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchMyListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  return (
    <AgentShell titleKey="hubs.agent.listings.title" subtitleKey="hubs.agent.listings.subtitle">
      <div className="mb-4">
        <Link to="/host/list" className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
          + Add listing
        </Link>
      </div>
      <div className="space-y-3">
        {listings.map((l) => (
          <article key={l.id} className="flex items-center justify-between panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-ink-secondary">{l.status}</p>
            </div>
            <Link to={`/property/${l.id}`} className="text-sm font-semibold text-ink underline">View</Link>
          </article>
        ))}
        {!listings.length && (
          <p className="text-sm text-ink-secondary">No listings yet — add one from the host flow.</p>
        )}
      </div>
    </AgentShell>
  )
}

export default function AgentListingsPage() {
  return <ProtectedRoute><Listings /></ProtectedRoute>
}
