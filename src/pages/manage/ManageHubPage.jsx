import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchPmsDashboard } from '../../services/pms-service'

const links = [
  { to: '/manage/tenants', label: 'Tenants', desc: 'Occupancy, leases, and balances' },
  { to: '/manage/work-orders', label: 'Work orders', desc: 'Maintenance and vendor dispatch' },
  { to: '/manage/finance', label: 'Rent & expenses', desc: 'Collection and expense tracking' },
  { to: '/manage/inspections', label: 'Inspections', desc: 'Move-in, quarterly, move-out reports' },
  { to: '/documents', label: 'Document vault', desc: 'Leases and compliance docs' },
]

function ManageHub() {
  const [portfolio, setPortfolio] = useState(null)

  useEffect(() => {
    fetchPmsDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])

  return (
    <ManageShell titleKey="hubs.manage.hub.title" subtitle={portfolio?.name || 'Portfolio overview'}>
      {portfolio && (
        <StatGrid>
          <StatCard label="Buildings" value={portfolio.buildings} />
          <StatCard label="Units" value={portfolio.units} />
          <StatCard label="Occupancy" value={portfolio.occupancy} />
          <StatCard label="Collected MTD" value={`GHS ${portfolio.collectedMtd.toLocaleString()}`} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </ManageShell>
  )
}

export default function ManageHubPage() {
  return <ProtectedRoute><ManageHub /></ProtectedRoute>
}
