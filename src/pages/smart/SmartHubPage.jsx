import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchSmartDashboard } from '../../services/smart-service'

const links = [
  { to: '/smart/devices', label: 'Device dashboard', desc: 'Locks, cameras, sensors, climate' },
  { to: '/smart/automations', label: 'Automation engine', desc: 'Rules and scheduled actions' },
  { to: '/smart/alerts', label: 'Alerts & event logs', desc: 'Security and device events' },
  { to: '/m/smart', label: 'Mobile app', desc: 'Control devices on the go' },
]

function SmartHub() {
  const [portfolio, setPortfolio] = useState(null)

  useEffect(() => {
    fetchSmartDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])

  return (
    <SmartShell titleKey="hubs.smart.hub.title" subtitle={portfolio?.building || 'Connected building management'}>
      {portfolio && (
        <StatGrid>
          <StatCard label="Devices online" value={`${portfolio.devicesOnline}/${portfolio.devicesTotal}`} />
          <StatCard label="Automations" value={portfolio.automationsActive} />
          <StatCard label="Alerts today" value={portfolio.alertsToday} />
          <StatCard label="Energy today" value={portfolio.energyToday} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </SmartShell>
  )
}

export default function SmartHubPage() {
  return <ProtectedRoute><SmartHub /></ProtectedRoute>
}
