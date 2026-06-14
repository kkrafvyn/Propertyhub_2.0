import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchDevices, getIotWebhookUrl, fetchIotEvents, simulateIotEvent } from '../../services/smart-service'

const typeIcons = { lock: '🔐', camera: '📷', climate: '🌡️', sensor: '💧' }

function Devices() {
  const { t } = useTranslation()
  const [devices, setDevices] = useState([])
  const [events, setEvents] = useState([])
  const webhookUrl = getIotWebhookUrl()

  useEffect(() => {
    fetchDevices().then(({ devices: rows }) => setDevices(rows))
    fetchIotEvents().then(({ events: rows }) => setEvents(rows))
  }, [])

  async function testWebhook(device) {
    await simulateIotEvent({
      deviceId: device.id,
      eventType: 'motion_detected',
      payload: { device: device.name, location: device.location },
    })
    fetchIotEvents().then(({ events: rows }) => setEvents(rows))
  }

  return (
    <SmartShell titleKey="hubs.smart.devices.title" subtitleKey="hubs.smart.devices.subtitle">
      {webhookUrl && (
        <div className="mb-6 panel-card bg-surface-subtle p-4">
          <p className="text-sm font-semibold">{t('extensions.iot.webhookTitle')}</p>
          <p className="mt-1 text-xs text-ink-secondary">{t('extensions.iot.webhookHint')}</p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-surface px-3 py-2 text-xs">{webhookUrl}</code>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <article key={d.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{typeIcons[d.type] || '📡'}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                d.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
              }`}>{d.status}</span>
            </div>
            <h2 className="mt-3 font-semibold">{d.name}</h2>
            <p className="text-sm text-ink-secondary">{d.location}</p>
            <div className="mt-3 flex justify-between text-xs text-ink-secondary">
              <span>{d.lastSeen}</span>
              {d.battery != null && <span>Battery {d.battery}%</span>}
            </div>
            <button type="button" onClick={() => testWebhook(d)} className="mt-3 text-xs font-semibold text-brand-accent underline">
              {t('extensions.iot.testEvent')}
            </button>
          </article>
        ))}
      </div>

      {events.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{t('extensions.iot.recentEvents')}</h2>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="panel-card bg-surface px-4 py-3 text-sm">
                <span className="font-semibold capitalize">{e.event_type?.replace('_', ' ')}</span>
                <span className="text-ink-secondary"> · {new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Add device</button>
    </SmartShell>
  )
}

export default function SmartDevicesPage() {
  return <ProtectedRoute><Devices /></ProtectedRoute>
}
