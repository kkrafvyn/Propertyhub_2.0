import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchBranches } from '../../services/agency-service'

function Branches() {
  const [branches, setBranches] = useState([])

  useEffect(() => {
    fetchBranches().then(({ branches: rows }) => setBranches(rows))
  }, [])

  return (
    <AgencyShell titleKey="hubs.agency.branches.title" subtitleKey="hubs.agency.branches.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <article key={b.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{b.name}</h2>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{b.status}</span>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">{b.location}</p>
            <p className="mt-3 text-sm">Manager: <span className="font-medium">{b.manager}</span></p>
            <div className="mt-3 flex gap-4 text-sm text-ink-secondary">
              <span>{b.agents} agents</span>
              <span>{b.listings} listings</span>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        Add branch
      </button>
    </AgencyShell>
  )
}

export default function AgencyBranchesPage() {
  return <ProtectedRoute><Branches /></ProtectedRoute>
}
