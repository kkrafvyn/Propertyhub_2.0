import { useEffect } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

const previewAlerts = [
  {
    id: 'preview-security',
    alert_type: 'security',
    severity: 'critical',
    title: 'Front door unlocked outside schedule',
    message: 'Access control reported an unlocked state after the nightly security window started.',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    dismissed: false,
  },
  {
    id: 'preview-device',
    alert_type: 'device',
    severity: 'warning',
    title: 'Thermostat offline',
    message: 'Climate control has not checked in recently. Confirm power and network status.',
    created_at: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
    dismissed: false,
  },
  {
    id: 'preview-system',
    alert_type: 'system',
    severity: 'info',
    title: 'Automation templates ready',
    message: 'Starter rules can be activated once the smart-device tables are connected.',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    dismissed: false,
  },
]

const alertTypes = ['security', 'device', 'system']

export default function Alerts() {
  const { alerts, fetchAlerts, dismissAlert, loading } = useSmartDeviceStore()
  const visibleAlerts = alerts.length > 0 ? alerts : previewAlerts
  const usingPreview = alerts.length === 0

  useEffect(() => {
    const propertyId = localStorage.getItem('currentPropertyId') || 'default'
    fetchAlerts(propertyId)

    const interval = setInterval(() => {
      fetchAlerts(propertyId)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const alertsByType = alertTypes.reduce((groups, type) => {
    groups[type] = visibleAlerts.filter((alert) => alert.alert_type === type)
    return groups
  }, {})

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
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-display-md font-bold">Alerts & Notifications</h1>
          <p className="mt-2 text-on-surface-variant">
            Review security, device, and system events across the selected property.
          </p>
        </div>
        {usingPreview && (
          <span className="rounded-full bg-primary/20 px-4 py-2 text-label-sm font-bold text-primary">
            Preview mode
          </span>
        )}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <AlertStat label="Total Alerts" value={visibleAlerts.length} tone="text-primary" />
        <AlertStat
          label="Critical"
          value={visibleAlerts.filter((alert) => alert.severity === 'critical').length}
          tone="text-red-500"
        />
        <AlertStat
          label="Warnings"
          value={visibleAlerts.filter((alert) => alert.severity === 'warning').length}
          tone="text-yellow-500"
        />
      </div>

      {alertTypes.map((type) => (
        <section key={type} className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-body-lg font-medium capitalize">{type} Alerts</h2>
            <span className="text-body-sm text-on-surface-variant">{alertsByType[type].length} active</span>
          </div>
          <div className="space-y-3">
            {alertsByType[type].map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start justify-between rounded-lg border border-gray-700 p-4 ${
                  alert.dismissed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{alert.title}</h3>
                    <span className={`rounded px-2 py-1 text-body-xs capitalize ${getAlertColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{alert.message}</p>
                  <p className="mt-2 text-body-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                {!usingPreview && !alert.dismissed && (
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    disabled={loading}
                    className="ml-4 px-3 py-1 text-gray-400 transition hover:text-white"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {usingPreview && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-6">
          <h2 className="text-body-lg font-bold">Alert workflow is ready</h2>
          <p className="mt-1 text-on-surface-variant">
            Live alerts will replace these examples after the smart alert tables and Edge Function are deployed.
          </p>
        </div>
      )}
    </div>
  )
}

function AlertStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-surface-container p-4">
      <p className="mb-1 text-body-sm text-on-surface-variant">{label}</p>
      <p className={`text-display-sm font-bold ${tone}`}>{value}</p>
    </div>
  )
}
