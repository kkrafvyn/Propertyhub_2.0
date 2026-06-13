import { Link } from 'react-router-dom'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { agencyListings } from '../../data/agency'

function Listings() {
  return (
    <AgentShell title="My listings" subtitle="Manage and optimize your portfolio">
      <div className="mb-4">
        <Link to="/host/list" className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
          + Add listing
        </Link>
      </div>
      <div className="space-y-3">
        {agencyListings.map((l) => (
          <article key={l.id} className="flex items-center justify-between rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-ink-secondary">{l.views} views · {l.status}</p>
            </div>
            <Link to={`/property/${l.id}`} className="text-sm font-semibold text-brand-dark underline">View</Link>
          </article>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentListingsPage() {
  return <ProtectedRoute><Listings /></ProtectedRoute>
}
