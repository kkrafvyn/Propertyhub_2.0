import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
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
    <SmartShell title="Smart property" subtitle={portfolio?.building || 'Connected building management'}>
      {portfolio && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Devices online" value={`${portfolio.devicesOnline}/${portfolio.devicesTotal}`} />
          <Stat label="Automations" value={portfolio.automationsActive} />
          <Stat label="Alerts today" value={portfolio.alertsToday} />
          <Stat label="Energy today" value={portfolio.energyToday} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </Link>
        ))}
      </div>
    </SmartShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  )
}

export default function SmartHubPage() {
  return <ProtectedRoute><SmartHub /></ProtectedRoute>
}
