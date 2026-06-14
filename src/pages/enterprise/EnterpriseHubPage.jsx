import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchEnterpriseDashboard } from '../../services/enterprise-service'

const links = [
  { to: '/enterprise/portfolios', label: 'Multi-country portfolios', desc: 'Assets across Ghana, Nigeria, Kenya' },
  { to: '/enterprise/esg', label: 'ESG reporting', desc: 'Sustainability and governance metrics' },
  { to: '/enterprise/forecast', label: 'Revenue forecast', desc: 'NOI projections by quarter' },
]

function Hub() {
  const [org, setOrg] = useState(null)

  useEffect(() => {
    fetchEnterpriseDashboard().then(({ org: o }) => setOrg(o))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.hub.title" subtitle={org?.name || 'Institutional portfolios'}>
      {org && (
        <StatGrid>
          <StatCard label="Countries" value={org.countries} />
          <StatCard label="Assets" value={org.assets} />
          <StatCard label="AUM" value={org.aum} />
          <StatCard label="Occupancy" value={org.occupancy} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </EnterpriseShell>
  )
}

export default function EnterpriseHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
