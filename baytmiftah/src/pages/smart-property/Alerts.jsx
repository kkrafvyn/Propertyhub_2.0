import { useEffect } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

export default function Alerts() {
  const { alerts, fetchAlerts, dismissAlert, loading } = useSmartDeviceStore()

  useEffect(() => {
    const propertyId = localStorage.getItem('currentPropertyId') || 'default'
    fetchAlerts(propertyId)

    // Refresh alerts every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts(propertyId)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const alertsByType = {
    security: alerts.filter((a) => a.alert_type === 'security'),
    device: alerts.filter((a) => a.alert_type === 'device'),
    system: alerts.filter((a) => a.alert_type === 'system'),
  }

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400'
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'info':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div>
      <h1 className="text-display-md font-bold mb-8">Alerts & Notifications</h1>

      {/* Alert Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Total Alerts</p>
          <p className="text-display-sm font-bold text-primary">{alerts.length}</p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Critical</p>
          <p className="text-display-sm font-bold text-red-500">
            {alerts.filter((a) => a.severity === 'critical').length}
          </p>
        </div>
        <div className="bg-surface-container rounded-lg p-4">
          <p className="text-on-surface-variant text-body-sm mb-1">Warnings</p>
          <p className="text-display-sm font-bold text-yellow-500">
            {alerts.filter((a) => a.severity === 'warning').length}
          </p>
        </div>
      </div>

      {/* Alerts by Type */}
      {Object.entries(alertsByType).map(([type, typeAlerts]) => (
        typeAlerts.length > 0 && (
          <div key={type} className="mb-8">
            <h2 className="text-body-lg font-medium mb-4 capitalize">{type} Alerts</h2>
            <div className="space-y-3">
              {typeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border border-gray-700 flex justify-between items-start ${
                    alert.dismissed ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{alert.title}</h3>
                      <span
                        className={`text-body-xs px-2 py-1 rounded capitalize ${getAlertColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-body-sm">{alert.message}</p>
                    <p className="text-body-xs text-gray-500 mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!alert.dismissed && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      disabled={loading}
                      className="ml-4 px-3 py-1 text-gray-400 hover:text-white transition"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {alerts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No alerts</p>
        </div>
      )}
    </div>
  )
}
