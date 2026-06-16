import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchDevices, getIotWebhookUrl, fetchIotEvents, simulateIotEvent, addDevice } from '../../services/smart-service'

import { deviceTypeIcons } from '../../components/icons'

function Devices() {
  const { t } = useTranslation()
  const [devices, setDevices] = useState([])
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'sensor', location: '' })
  const [loading, setLoading] = useState(false)
  const webhookUrl = getIotWebhookUrl()

  function reload() {
    fetchDevices().then(({ devices: rows }) => setDevices(rows))
    fetchIotEvents().then(({ events: rows }) => setEvents(rows))
  }

  useEffect(() => { reload() }, [])

  async function testWebhook(device) {
    await simulateIotEvent({
      deviceId: device.id,
      eventType: 'motion_detected',
      payload: { device: device.name, location: device.location },
    })
    reload()
  }

  async function handleAddDevice() {
    if (!form.name.trim()) return
    setLoading(true)
    const result = await addDevice(form)
    if (result?.device) setDevices((prev) => [...prev, { ...result.device, lastSeen: 'Just now' }])
    setShowForm(false)
    setForm({ name: '', type: 'sensor', location: '' })
    setLoading(false)
    reload()
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
        {devices.map((d) => {
          const DeviceIcon = deviceTypeIcons[d.type] || deviceTypeIcons.default
          return (
          <article key={d.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <DeviceIcon className="h-7 w-7 text-ink-secondary" />
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
          )
        })}
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

      <button type="button" onClick={() => setShowForm(true)} className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Add device</button>

      {showForm && (
        <QuickFormModal title="Add device" onClose={() => setShowForm(false)} onSubmit={handleAddDevice} submitLabel="Add device" loading={loading}>
          <ModalField label="Device name">
            <input className={modalInputClassName()} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Living room motion" />
          </ModalField>
          <ModalField label="Type">
            <select className={modalInputClassName()} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="sensor">Sensor</option>
              <option value="lock">Smart lock</option>
              <option value="thermostat">Thermostat</option>
              <option value="camera">Camera</option>
            </select>
          </ModalField>
          <ModalField label="Location">
            <input className={modalInputClassName()} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Unit 4B" />
          </ModalField>
        </QuickFormModal>
      )}
    </SmartShell>
  )
}

export default function SmartDevicesPage() {
  return <ProtectedRoute><Devices /></ProtectedRoute>
}
