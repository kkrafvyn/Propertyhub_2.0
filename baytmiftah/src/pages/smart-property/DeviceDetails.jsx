import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'
import smartDeviceService from '../../services/smart-device-service'

export default function DeviceDetails() {
  const { deviceId } = useParams()
  const { currentDevice, fetchDeviceById, sendCommand, loading } = useSmartDeviceStore()
  const [eventLogs, setEventLogs] = useState([])

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
      loadEventLogs()
    }
  }, [deviceId])

  const loadEventLogs = async () => {
    try {
      const logs = await smartDeviceService.getEventLogs(deviceId, 10)
      setEventLogs(logs)
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const handleCommand = async (action) => {
    try {
      await sendCommand(deviceId, { action })
      await loadEventLogs()
    } catch (error) {
      console.error('Error sending command:', error)
    }
  }

  if (!currentDevice) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-display-md font-bold mb-8">{currentDevice.name}</h1>

      {/* Device Status Card */}
      <div className="bg-surface-container rounded-lg p-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-body-lg font-medium mb-1">Device Status</h2>
            <p className="text-on-surface-variant">
              {currentDevice.type.replace('_', ' ')} • {currentDevice.brand}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-full font-medium capitalize ${
              currentDevice.status === 'online'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {currentDevice.status}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div>
            <p className="text-on-surface-variant text-body-sm mb-1">Model</p>
            <p className="text-white font-medium">{currentDevice.model}</p>
          </div>
          {currentDevice.battery_level && (
            <div>
              <p className="text-on-surface-variant text-body-sm mb-1">Battery</p>
              <p className="text-white font-medium">{currentDevice.battery_level}%</p>
            </div>
          )}
          {currentDevice.signal_strength && (
            <div>
              <p className="text-on-surface-variant text-body-sm mb-1">Signal</p>
              <p className="text-white font-medium">{currentDevice.signal_strength}%</p>
            </div>
          )}
          <div>
            <p className="text-on-surface-variant text-body-sm mb-1">Last Seen</p>
            <p className="text-white font-medium">
              {new Date(currentDevice.last_seen).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 flex-wrap">
          {['lock', 'unlock', 'turn_on', 'turn_off'].map((action) => (
            <button
              key={action}
              onClick={() => handleCommand(action)}
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 capitalize"
            >
              {loading ? 'Sending...' : action.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Event Logs */}
      <div className="bg-surface-container rounded-lg p-6">
        <h2 className="text-body-lg font-medium mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {eventLogs.map((log) => (
            <div key={log.id} className="p-3 bg-surface rounded-lg border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium capitalize">{log.event_type.replace('_', ' ')}</p>
                  <p className="text-body-sm text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                {log.event_data && (
                  <span className="text-body-sm text-gray-500">
                    {JSON.stringify(log.event_data)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
