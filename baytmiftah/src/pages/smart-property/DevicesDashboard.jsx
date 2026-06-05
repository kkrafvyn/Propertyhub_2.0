import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

export default function DevicesDashboard() {
  const navigate = useNavigate()
  const { devices, fetchDevices, loading } = useSmartDeviceStore()
  const [propertyId, setPropertyId] = useState('default')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (propertyId !== 'default') {
      fetchDevices(propertyId)
    }
  }, [propertyId])

  const filteredDevices = devices.filter((device) => {
    if (filter === 'all') return true
    return device.type === filter
  })

  const deviceStats = {
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    total: devices.length,
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-md font-bold">Smart Devices</h1>
        <button
          onClick={() => navigate('/smart-property/add-device')}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + Add Device
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Total Devices</p>
          <p className="text-display-sm font-bold text-primary">{deviceStats.total}</p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Online</p>
          <p className="text-display-sm font-bold text-green-500">{deviceStats.online}</p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Offline</p>
          <p className="text-display-sm font-bold text-red-500">{deviceStats.offline}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'smart_lock', 'camera', 'light', 'sensor', 'thermostat'].map(
          (type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg transition capitalize ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-gray-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Devices' : type.replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Devices Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <button
            key={device.id}
            onClick={() => navigate(`/smart-property/device/${device.id}`)}
            className="bg-surface-container rounded-lg p-6 hover:shadow-lg transition text-left"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-body-lg font-medium">{device.name}</h3>
                <p className="text-on-surface-variant text-body-sm capitalize">
                  {device.type.replace('_', ' ')}
                </p>
              </div>
              <span
                className={`w-3 h-3 rounded-full ${
                  device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>

            <div className="space-y-2 text-body-sm text-on-surface-variant">
              {device.battery_level && (
                <div className="flex justify-between">
                  <span>Battery</span>
                  <span>{device.battery_level}%</span>
                </div>
              )}
              {device.signal_strength && (
                <div className="flex justify-between">
                  <span>Signal</span>
                  <span>{device.signal_strength}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Last Seen</span>
                <span>
                  {new Date(device.last_seen).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-primary text-white rounded text-body-sm hover:bg-primary/90">
                Control
              </button>
            </div>
          </button>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant mb-4">No devices found</p>
          <button
            onClick={() => navigate('/smart-property/add-device')}
            className="text-primary hover:text-primary/80"
          >
            Add your first device
          </button>
        </div>
      )}
    </div>
  )
}
