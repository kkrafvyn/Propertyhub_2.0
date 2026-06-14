import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchDevices } from '../../services/smart-service'

const typeIcons = { lock: '🔐', camera: '📷', climate: '🌡️', sensor: '💧' }

function Devices() {
  const [devices, setDevices] = useState([])

  useEffect(() => {
    fetchDevices().then(({ devices: rows }) => setDevices(rows))
  }, [])

  return (
    <SmartShell titleKey="hubs.smart.devices.title" subtitleKey="hubs.smart.devices.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <article key={d.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{typeIcons[d.type] || '📡'}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                d.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>{d.status}</span>
            </div>
            <h2 className="mt-3 font-semibold">{d.name}</h2>
            <p className="text-sm text-ink-secondary">{d.location}</p>
            <div className="mt-3 flex justify-between text-xs text-ink-secondary">
              <span>{d.lastSeen}</span>
              {d.battery != null && <span>Battery {d.battery}%</span>}
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Add device</button>
    </SmartShell>
  )
}

export default function SmartDevicesPage() {
  return <ProtectedRoute><Devices /></ProtectedRoute>
}
