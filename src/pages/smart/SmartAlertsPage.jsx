import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAlertsAndLogs } from '../../services/smart-service'

const alertStyles = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-surface-border bg-surface',
}

function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => {
    fetchAlertsAndLogs().then(({ alerts: a, logs: l }) => {
      setAlerts(a)
      setLogs(l)
    })
  }, [])

  return (
    <SmartShell titleKey="hubs.smart.alerts.title" subtitleKey="hubs.smart.alerts.subtitle">
      <h3 className="mb-3 font-semibold">Active alerts</h3>
      <div className="space-y-2">
        {alerts.map((a) => (
          <article key={a.id} className={`rounded-lg border p-4 ${alertStyles[a.type] || alertStyles.info}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-ink-secondary">{a.device} · {a.time}</p>
              </div>
              {!a.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
            </div>
          </article>
        ))}
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Event log</h3>
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((ev) => (
              <tr key={ev.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">{ev.event}</td>
                <td className="px-4 py-3 text-ink-secondary">{ev.source}</td>
                <td className="px-4 py-3">{ev.user}</td>
                <td className="px-4 py-3 text-ink-secondary">{ev.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SmartShell>
  )
}

export default function SmartAlertsPage() {
  return <ProtectedRoute><Alerts /></ProtectedRoute>
}
