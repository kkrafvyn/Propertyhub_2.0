import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAgencyDashboard } from '../../services/agency-service'

function AgencyOverview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAgencyDashboard().then(setData)
  }, [])

  if (!data) return <AgencyShell title="Overview"><p>Loading…</p></AgencyShell>

  const { agency, leads, listings } = data

  return (
    <AgencyShell title="Agency overview" subtitle={`${agency.name} · Trust score ${agency.trustScore}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active listings" value={agency.activeListings} />
        <Stat label="Team members" value={agency.teamCount} />
        <Stat label="Leads this month" value={agency.leadsThisMonth} />
        <Stat label="Trust score" value={`${agency.trustScore}%`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent leads">
          {leads.slice(0, 3).map((lead) => (
            <div key={lead.id} className="flex justify-between border-b border-surface-border py-3 text-sm last:border-0">
              <span>{lead.name} · {lead.property}</span>
              <span className="text-ink-secondary">{lead.stage}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Top listings">
          {listings.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-surface-border py-3 text-sm last:border-0">
              <span>{item.title}</span>
              <span className="text-ink-secondary">{item.views} views</span>
            </div>
          ))}
        </Panel>
      </div>
    </AgencyShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export default function AgencyDashboardPage() {
  return <ProtectedRoute><AgencyOverview /></ProtectedRoute>
}
