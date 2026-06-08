import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PropTechShell from '../../components/PropTechShell'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'
import smartDeviceService from '../../services/smart-device-service'

const previewDevice = {
  id: 'preview-device',
  name: 'Front Door Lock',
  type: 'smart_lock',
  brand: 'SecureHome',
  model: 'SL-2024',
  status: 'online',
  battery_level: 86,
  signal_strength: 92,
  last_seen: new Date().toISOString(),
}

const previewLogs = [
  {
    id: 'preview-1',
    event_type: 'lock',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    event_data: { source: 'Night security rule' },
  },
  {
    id: 'preview-2',
    event_type: 'unlock',
    created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    event_data: { source: 'Resident access' },
  },
  {
    id: 'preview-3',
    event_type: 'status',
    created_at: new Date(Date.now() - 1000 * 60 * 92).toISOString(),
    event_data: { battery: '86%', signal: '92%' },
  },
]

const historyKey = (deviceId) => `baytmiftah_command_history_${deviceId || 'unknown'}`

const loadCommandHistory = (deviceId) => {
  try {
    return JSON.parse(localStorage.getItem(historyKey(deviceId)) || '[]')
  } catch {
    return []
  }
}

const saveCommandHistory = (deviceId, history) => {
  localStorage.setItem(historyKey(deviceId), JSON.stringify(history.slice(0, 20)))
}

export default function DeviceDetails() {
  const { deviceId } = useParams()
  const { currentDevice, fetchDeviceById, sendCommand, loading } = useSmartDeviceStore()
  const [eventLogs, setEventLogs] = useState([])
  const [commandStatus, setCommandStatus] = useState('')
  const [commandHistory, setCommandHistory] = useState(() => loadCommandHistory(deviceId))
  const [deviceLoading, setDeviceLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDevice() {
      setDeviceLoading(true)
      if (deviceId) {
        await fetchDeviceById(deviceId)
        await loadEventLogs()
      }
      if (mounted) setDeviceLoading(false)
    }

    loadDevice()

    return () => {
      mounted = false
    }
  }, [deviceId])

  useEffect(() => {
    setCommandHistory(loadCommandHistory(deviceId))
  }, [deviceId])

  const loadEventLogs = async () => {
    try {
      const logs = await smartDeviceService.getEventLogs(deviceId, 10)
      setEventLogs(logs || [])
    } catch (error) {
      if (!/sign in|auth|jwt|session/i.test(error?.message || '')) {
        console.error('Error loading logs:', error)
      }
      setEventLogs([])
    }
  }

  const handleCommand = async (action) => {
    try {
      setCommandStatus(`Sending ${action.replace('_', ' ')} command...`)
      await sendCommand(deviceId, { action })
      setCommandHistory((history) => {
        const next = [
          {
            id: `${action}-${Date.now()}`,
            action,
            status: 'sent',
            created_at: new Date().toISOString(),
          },
          ...history,
        ]
        saveCommandHistory(deviceId, next)
        return next
      })
      await smartDeviceService
        .logEvent(deviceId, 'command_sent', { action, source: 'device_details' })
        .catch(() => {})
      await loadEventLogs()
      setCommandStatus(`${action.replace('_', ' ')} command sent`)
    } catch (error) {
      console.error('Error sending command:', error)
      setCommandHistory((history) => {
        const next = [
          {
          id: `${action}-${Date.now()}`,
          action,
          status: 'preview',
          created_at: new Date().toISOString(),
          },
          ...history,
        ]
        saveCommandHistory(deviceId, next)
        return next
      })
      setCommandStatus('Command preview ready. Live commands require a deployed device function.')
    }
  }

  const device = currentDevice || previewDevice
  const logs = eventLogs.length > 0 ? eventLogs : previewLogs
  const usingPreview = !currentDevice

  if (deviceLoading && !currentDevice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-on-surface">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          <p className="mt-3 font-semibold">Loading device details</p>
        </div>
      </div>
    )
  }

  return (
    <PropTechShell
      active="Smart Property"
      brand={device.name}
      sidebarTitle="PropTech"
      sidebarSubtitle="Agency Command"
      searchPlaceholder="Search device history..."
      primaryAction=""
    >
    <main className="px-5 py-8 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-display-md font-bold">{device.name}</h1>
          <p className="mt-2 text-on-surface-variant">
            {(device.type || 'device').replace('_', ' ')} / {device.brand || 'Unknown brand'}
          </p>
        </div>
        <Link to="/smart-property/devices" className="rounded-lg border border-gray-600 px-4 py-2 font-semibold">
          Back to devices
        </Link>
      </div>

      {usingPreview && (
        <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-on-surface">
          Showing a device preview because the selected device record is not available yet.
        </div>
      )}

      <div className="mb-8 rounded-lg bg-surface-container p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="mb-1 text-body-lg font-medium">Device Status</h2>
            <p className="text-on-surface-variant">
              {device.model || 'Model pending'} / Last seen {formatDate(device.last_seen)}
            </p>
          </div>
          <div
            className={`rounded-full px-4 py-2 font-medium capitalize ${
              device.status === 'online'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {device.status || 'unknown'}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <DeviceMetric label="Model" value={device.model || 'Pending'} />
          <DeviceMetric label="Battery" value={device.battery_level ? `${device.battery_level}%` : 'N/A'} />
          <DeviceMetric label="Signal" value={device.signal_strength ? `${device.signal_strength}%` : 'N/A'} />
          <DeviceMetric label="Last Seen" value={formatTime(device.last_seen)} />
        </div>

        <div className="flex flex-wrap gap-3">
          {['lock', 'unlock', 'turn_on', 'turn_off'].map((action) => (
            <button
              key={action}
              onClick={() => handleCommand(action)}
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-2 capitalize text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Sending...' : action.replace('_', ' ')}
            </button>
          ))}
        </div>
        {commandStatus && <p className="mt-4 text-body-sm text-on-surface-variant">{commandStatus}</p>}
      </div>

      <div className="rounded-lg bg-surface-container p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-body-lg font-medium">Recent Activity</h2>
          <span className="text-body-sm text-on-surface-variant">{logs.length} events</span>
        </div>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-gray-700 bg-surface p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium capitalize">{(log.event_type || 'event').replace('_', ' ')}</p>
                  <p className="text-body-sm text-gray-400">{formatDate(log.created_at)}</p>
                </div>
                {log.event_data && (
                  <span className="rounded bg-gray-800 px-3 py-1 text-body-sm text-gray-300">
                    {JSON.stringify(log.event_data)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-surface-container p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-body-lg font-medium">Command History</h2>
          <span className="text-body-sm text-on-surface-variant">{commandHistory.length} saved commands</span>
        </div>
        {commandHistory.length > 0 ? (
          <div className="space-y-3">
            {commandHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-surface p-3">
                <span className="font-semibold capitalize">{item.action.replace('_', ' ')}</span>
                <span className={`rounded-full px-3 py-1 text-sm ${
                  item.status === 'sent' ? 'bg-green-500/20 text-green-300' : 'bg-primary/20 text-primary'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-gray-700 bg-surface p-4 text-on-surface-variant">
            Commands you send from this page will be saved locally and mirrored to event logs when the backend accepts them.
          </p>
        )}
      </div>
    </main>
    </PropTechShell>
  )
}

function DeviceMetric({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-body-sm text-on-surface-variant">{label}</p>
      <p className="font-medium text-white">{value}</p>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString()
}

function formatTime(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleTimeString()
}
