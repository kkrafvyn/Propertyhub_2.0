import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchSmartDashboard, fetchDevices, fetchAlertsAndLogs } from '../../services/smart-service'

function SmartHome() {
  const [portfolio, setPortfolio] = useState(null)
  const [devices, setDevices] = useState([])

  useEffect(() => {
    fetchSmartDashboard().then(({ portfolio: p }) => setPortfolio(p))
    fetchDevices().then(({ devices: d }) => setDevices(d.slice(0, 4)))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title="Smart Property" subtitle={portfolio?.building || 'Connected home'} />
      <section className="space-y-4 px-4 pb-6">
        {portfolio && (
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Online" value={`${portfolio.devicesOnline}/${portfolio.devicesTotal}`} />
            <MiniStat label="Alerts" value={portfolio.alertsToday} />
          </div>
        )}
        <h2 className="text-sm font-bold text-ink-secondary">Quick controls</h2>
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 shadow-sm">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-ink-secondary">{d.location}</p>
              </div>
              <span className={`text-xs font-semibold capitalize ${d.status === 'online' ? 'text-green-700' : 'text-red-600'}`}>{d.status}</span>
            </div>
          ))}
        </div>
        <Link to="/smart" className="block text-center text-sm text-brand-dark underline">Open full dashboard →</Link>
      </section>
    </MobileShell>
  )
}

function SmartAlertsMobile() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    fetchAlertsAndLogs().then(({ alerts: a }) => setAlerts(a))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title="Alerts" backTo="/m/smart" />
      <section className="space-y-2 px-4 pb-6">
        {alerts.map((a) => (
          <article key={a.id} className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="font-semibold">{a.title}</p>
            <p className="text-xs text-ink-secondary">{a.time}</p>
          </article>
        ))}
      </section>
    </MobileShell>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-lg font-bold text-brand-dark">{value}</p>
    </div>
  )
}

export function MobileSmartHomePage() {
  return <ProtectedRoute><SmartHome /></ProtectedRoute>
}

export function MobileSmartAlertsPage() {
  return <ProtectedRoute><SmartAlertsMobile /></ProtectedRoute>
}
