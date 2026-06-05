import { useEffect, useState } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

export default function EventLogs() {
  const { fetchEventLogs, loading } = useSmartDeviceStore()
  const [eventLogs, setEventLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [deviceFilter, setDeviceFilter] = useState('all')

  useEffect(() => {
    const propertyId = localStorage.getItem('currentPropertyId') || 'default'
    loadLogs(propertyId)
  }, [])

  const loadLogs = async (propertyId) => {
    try {
      // This would typically load all property logs
      setEventLogs([
        {
          id: '1',
          device: 'Front Door Lock',
          event_type: 'lock',
          created_at: new Date().toISOString(),
          user: 'You',
        },
        {
          id: '2',
          device: 'Living Room Camera',
          event_type: 'motion_detected',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          user: 'System',
        },
      ])
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const filteredLogs = eventLogs.filter((log) => {
    let matches = true
    if (filter !== 'all') {
      matches = matches && log.event_type === filter
    }
    if (deviceFilter !== 'all') {
      matches = matches && log.device === deviceFilter
    }
    return matches
  })

  const eventTypes = ['all', 'lock', 'unlock', 'motion_detected', 'command', 'alert']
  const devices = ['all', 'Front Door Lock', 'Living Room Camera', 'Thermostat']

  return (
    <div>
      <h1 className="text-display-md font-bold mb-8">Event Logs</h1>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-body-md font-medium mb-2">Event Type</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-surface-container border border-gray-600 rounded-lg px-4 py-2 text-white"
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Events' : type.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-body-md font-medium mb-2">Device</label>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="w-full bg-surface-container border border-gray-600 rounded-lg px-4 py-2 text-white"
          >
            {devices.map((device) => (
              <option key={device} value={device}>
                {device === 'all' ? 'All Devices' : device}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Event Logs Table */}
      <div className="bg-surface-container rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-surface">
                <th className="px-6 py-3 text-left text-body-md font-medium">Timestamp</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Device</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">Event Type</th>
                <th className="px-6 py-3 text-left text-body-md font-medium">User/System</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-700 hover:bg-surface transition">
                  <td className="px-6 py-3">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">{log.device}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-gray-700 rounded text-body-sm capitalize">
                      {log.event_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-on-surface-variant">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No events found</p>
        </div>
      )}
    </div>
  )
}
