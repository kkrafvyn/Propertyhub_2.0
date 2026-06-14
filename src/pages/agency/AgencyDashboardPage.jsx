import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { DataRow, PanelCard, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchAgencyDashboard } from '../../services/agency-service'

function AgencyOverview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAgencyDashboard().then(setData)
  }, [])

  if (!data) {
    return (
      <AgencyShell titleKey="hubs.agency.dashboard.title" subtitleKey="hubs.agency.dashboard.subtitle">
        <div className="h-40 animate-pulse rounded-xl bg-surface-hover" />
      </AgencyShell>
    )
  }

  const { agency, leads, listings } = data

  return (
    <AgencyShell
      titleKey="hubs.agency.dashboard.title"
      subtitleKey="hubs.agency.dashboard.loadedSubtitle"
      subtitleVars={{ name: agency.name, trustScore: agency.trustScore }}
    >
      <StatGrid>
        <StatCard label="Active listings" value={agency.activeListings} />
        <StatCard label="Team members" value={agency.teamCount} />
        <StatCard label="Leads this month" value={agency.leadsThisMonth} />
        <StatCard label="Trust score" value={`${agency.trustScore}%`} />
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Recent leads">
          {leads.slice(0, 3).map((lead) => (
            <DataRow
              key={lead.id}
              primary={`${lead.name} · ${lead.property}`}
              meta={lead.stage}
            />
          ))}
        </PanelCard>
        <PanelCard title="Top listings">
          {listings.map((item) => (
            <DataRow key={item.id} primary={item.title} meta={`${item.views} views`} />
          ))}
        </PanelCard>
      </div>
    </AgencyShell>
  )
}

export default function AgencyDashboardPage() {
  return <ProtectedRoute><AgencyOverview /></ProtectedRoute>
}
