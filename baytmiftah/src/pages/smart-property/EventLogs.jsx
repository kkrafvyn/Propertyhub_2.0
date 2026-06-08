import { useEffect, useMemo, useState } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

const previewLogs = [
  {
    id: 'preview-lock',
    device: 'Front Door Lock',
    event_type: 'lock',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    user: 'Automation',
    result: 'Success',
  },
  {
    id: 'preview-motion',
    device: 'Living Room Camera',
    event_type: 'motion_detected',
    created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    user: 'System',
    result: 'Reviewed',
  },
  {
    id: 'preview-command',
    device: 'Thermostat',
    event_type: 'command',
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    user: 'You',
    result: 'Queued',
  },
]

export default function EventLogs() {
  const { fetchEventLogs, eventLogs: storeLogs, loading } = useSmartDeviceStore()
  const [eventLogs, setEventLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [deviceFilter, setDeviceFilter] = useState('all')

  useEffect(() => {
    const deviceId = localStorage.getItem('currentDeviceId') || 'default'
    fetchEventLogs(deviceId).then((logs) => setEventLogs(logs || []))
  }, [])

  useEffect(() => {
    if (storeLogs.length > 0) setEventLogs(storeLogs)
  }, [storeLogs])

  const visibleLogs = eventLogs.length > 0 ? eventLogs : previewLogs
  const usingPreview = eventLogs.length === 0

  const eventTypes = useMemo(
    () => ['all', ...Array.from(new Set(visibleLogs.map((log) => log.event_type).filter(Boolean)))],
    [visibleLogs]
  )
  const devices = useMemo(
    () => ['all', ...Array.from(new Set(visibleLogs.map((log) => log.device || log.device_name).filter(Boolean)))],
    [visibleLogs]
  )

  const filteredLogs = visibleLogs.filter((log) => {
    const deviceName = log.device || log.device_name
    return (
      (filter === 'all' || log.event_type === filter) &&
      (deviceFilter === 'all' || deviceName === deviceFilter)
    )
  })

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-display-md font-bold">Event Logs</h1>
          <p className="mt-2 text-on-surface-variant">
            Audit device commands, automation triggers, and security events.
          </p>
        </div>
        <div className="rounded-lg bg-surface-container px-4 py-3">
          <p className="text-body-sm text-on-surface-variant">Visible events</p>
          <p className="text-2xl font-black text-primary">{filteredLogs.length}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <FilterSelect label="Event Type" value={filter} onChange={setFilter} options={eventTypes} />
        <FilterSelect label="Device" value={deviceFilter} onChange={setDeviceFilter} options={devices} />
      </div>

      <div className="overflow-hidden rounded-lg bg-surface-container">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-surface">
                <th className="px-6 py-3 text-left text-body-md font-medium">Timestamp</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Device</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Event Type</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">User/System</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-700 transition hover:bg-surface">
                  <td className="px-6 py-3">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3">{log.device || log.device_name || 'Device'}</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-gray-700 px-2 py-1 text-body-sm capitalize">
                      {(log.event_type || 'event').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{log.user || log.actor || 'System'}</td>
                  <td className="px-6 py-3 text-on-surface-variant">{log.result || log.status || 'Recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="mt-6 rounded-lg border border-gray-700 bg-surface-container p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-primary">manage_search</span>
          <h2 className="mt-3 text-body-lg font-bold">No events match these filters</h2>
          <p className="mt-1 text-on-surface-variant">Change the event type or device filter to inspect more logs.</p>
        </div>
      )}

      {usingPreview && (
        <div className="mt-8 rounded-lg border border-primary/40 bg-primary/10 p-6">
          <h2 className="text-body-lg font-bold">Event log workflow is ready</h2>
          <p className="mt-1 text-on-surface-variant">
            Live device events will replace these preview rows after device logging is deployed.
          </p>
        </div>
      )}

      {loading && <p className="mt-4 text-body-sm text-on-surface-variant">Refreshing event logs...</p>}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-body-md font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-surface-container px-4 py-2 text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? `All ${label}s` : option.replace('_', ' ').toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  )
}
