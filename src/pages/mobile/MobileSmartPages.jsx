import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { MobileCard, MobileStat, MobileTextLink } from '../../components/ui/MobileUI'
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
      <MobileHeader title="Smart property" subtitle={portfolio?.building || 'Connected home'} backTo="/m/profile" />
      <section className="space-y-4 px-4 pb-6">
        {portfolio && (
          <div className="grid grid-cols-2 gap-3">
            <MobileStat label="Online" value={`${portfolio.devicesOnline}/${portfolio.devicesTotal}`} />
            <MobileStat label="Alerts today" value={portfolio.alertsToday} />
          </div>
        )}
        <h2 className="text-sm font-semibold text-ink-secondary">Quick controls</h2>
        <div className="space-y-2">
          {devices.map((d) => (
            <MobileCard key={d.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-ink">{d.name}</p>
                <p className="text-xs text-ink-secondary">{d.location}</p>
              </div>
              <span className={`text-xs font-semibold capitalize ${d.status === 'online' ? 'text-green-700' : 'text-red-600'}`}>
                {d.status}
              </span>
            </MobileCard>
          ))}
        </div>
        <MobileTextLink to="/smart" className="block text-center">Open full dashboard →</MobileTextLink>
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
          <MobileCard key={a.id}>
            <p className="font-semibold text-ink">{a.title}</p>
            <p className="text-xs text-ink-secondary">{a.time}</p>
          </MobileCard>
        ))}
      </section>
    </MobileShell>
  )
}

export function MobileSmartHomePage() {
  return <ProtectedRoute><SmartHome /></ProtectedRoute>
}

export function MobileSmartAlertsPage() {
  return <ProtectedRoute><SmartAlertsMobile /></ProtectedRoute>
}
