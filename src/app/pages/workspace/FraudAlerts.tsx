import React, { useEffect, useState } from 'react'
import { AlertCircle, TrendingUp, Shield, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react'
import {
  enhancedFraudDetectionService,
  type FraudScanSummary,
} from '@/lib/enhanced-fraud-detection.service'

interface FraudAlert {
  id: string
  alert_type: 'duplicate_listing' | 'suspicious_lead' | 'price_mismatch' | 'image_reuse' | 'fake_listing' | 'scam_pattern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  evidence: any
  status: 'active' | 'investigating' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
}

interface FraudMetrics {
  totalAlerts: number
  criticalAlerts: number
  highAlerts: number
  mediumAlerts: number
  lowAlerts: number
  resolvedRate: number
}

export function FraudAlerts({ organizationId }: { organizationId: string }) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [scanSummary, setScanSummary] = useState<FraudScanSummary | null>(null)
  const [metrics, setMetrics] = useState<FraudMetrics>({
    totalAlerts: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0,
    resolvedRate: 0,
  })
  const [filter, setFilter] = useState<'active' | 'investigating' | 'resolved' | 'dismissed' | 'all'>('active')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)

  useEffect(() => {
    void loadAlerts()
  }, [organizationId])

  async function loadAlerts() {
    setLoading(true)
    try {
      const fraudAlerts = await enhancedFraudDetectionService.getFraudAlerts(organizationId, undefined, 200)
      setAlerts(fraudAlerts || [])
      calculateMetrics(fraudAlerts || [])
    } catch (error) {
      console.error('Failed to load fraud alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshScan() {
    setScanning(true)
    try {
      const summary = await enhancedFraudDetectionService.runComprehensiveFraudScan(organizationId)
      setScanSummary(summary)
      await loadAlerts()
    } catch (error) {
      console.error('Failed to refresh fraud scan:', error)
    } finally {
      setScanning(false)
    }
  }

  function calculateMetrics(alertsData: FraudAlert[]) {
    const critical = alertsData.filter(a => a.severity === 'critical').length
    const high = alertsData.filter(a => a.severity === 'high').length
    const medium = alertsData.filter(a => a.severity === 'medium').length
    const low = alertsData.filter(a => a.severity === 'low').length
    const resolved = alertsData.filter(a => a.status === 'resolved').length

    setMetrics({
      totalAlerts: alertsData.length,
      criticalAlerts: critical,
      highAlerts: high,
      mediumAlerts: medium,
      lowAlerts: low,
      resolvedRate: alertsData.length > 0 ? Math.round((resolved / alertsData.length) * 100) : 0,
    })
  }

  async function updateAlertStatus(alertId: string, newStatus: FraudAlert['status']) {
    setAlerts(prev => {
      const nextAlerts = prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: newStatus,
              resolved_at: newStatus === 'resolved' ? new Date().toISOString() : a.resolved_at,
            }
          : a
      )
      calculateMetrics(nextAlerts)
      return nextAlerts
    })

    try {
      await enhancedFraudDetectionService.updateAlertStatus(alertId, newStatus)
    } catch (error) {
      console.error('Failed to update alert status:', error)
      loadAlerts() // Reload on error
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = filter === 'all' || alert.status === filter
    const severityMatch = severityFilter === 'all' || alert.severity === severityFilter
    return statusMatch && severityMatch
  })

  const getSeverityColor = (severity: FraudAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: FraudAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'low':
        return <AlertCircle className="w-5 h-5 text-blue-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusIcon = (status: FraudAlert['status']) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />
      case 'investigating':
        return <Eye className="w-4 h-4" />
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'dismissed':
        return <EyeOff className="w-4 h-4 text-gray-400" />
      default:
        return null
    }
  }

  const getAlertTypeLabel = (type: FraudAlert['alert_type']) => {
    const labels: Record<FraudAlert['alert_type'], string> = {
      duplicate_listing: 'Duplicate Listing',
      suspicious_lead: 'Suspicious Lead',
      price_mismatch: 'Price Mismatch',
      image_reuse: 'Image Reuse',
      fake_listing: 'Fake Listing',
      scam_pattern: 'Scam Pattern',
    }
    return labels[type]
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-ink flex items-center gap-2">
              <Shield className="w-8 h-8 text-red-600" />
              Fraud Detection Dashboard
            </h1>
            <p className="text-ink-secondary mt-1">
              Monitor and resolve suspicious listings and leads
            </p>
          </div>
          <button
            onClick={() => void handleRefreshScan()}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition"
            disabled={scanning}
          >
            {scanning ? 'Running Scan...' : 'Refresh Scan'}
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCard
            label="Total Alerts"
            value={metrics.totalAlerts}
            icon={<AlertCircle className="w-6 h-6" />}
            color="bg-surface border border-surface-border text-ink"
            iconColor="text-ink-secondary"
          />
          <MetricCard
            label="Critical"
            value={metrics.criticalAlerts}
            icon={<AlertCircle className="w-6 h-6" />}
            color="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"
            iconColor="text-red-600"
          />
          <MetricCard
            label="High"
            value={metrics.highAlerts}
            icon={<AlertCircle className="w-6 h-6" />}
            color="bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300"
            iconColor="text-orange-600"
          />
          <MetricCard
            label="Medium"
            value={metrics.mediumAlerts}
            icon={<AlertCircle className="w-6 h-6" />}
            color="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-300"
            iconColor="text-yellow-600"
          />
          <MetricCard
            label="Resolved"
            value={`${metrics.resolvedRate}%`}
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
            iconColor="text-green-600"
          />
        </div>

        {scanSummary && (
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-ink">Latest Scan Summary</h2>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-ink">
              <div className="rounded-lg bg-surface-subtle border border-surface-border p-3">
                Duplicate listings: {scanSummary.duplicateListings}
              </div>
              <div className="rounded-lg bg-surface-subtle border border-surface-border p-3">
                Suspicious leads: {scanSummary.suspiciousLeads}
              </div>
              <div className="rounded-lg bg-surface-subtle border border-surface-border p-3">
                Image issues: {scanSummary.imageIssues}
              </div>
              <div className="rounded-lg bg-surface-subtle border border-surface-border p-3">
                Active alerts: {scanSummary.totalAlertsCreated}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Status Filter
            </label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 border border-border rounded-lg bg-input-background text-ink outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Severity Filter
            </label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as typeof severityFilter)}
              className="px-3 py-2 border border-border rounded-lg bg-input-background text-ink outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="ml-auto pt-6">
            <p className="text-sm text-ink-muted">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </p>
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-surface-border border-t-primary rounded-full"></div>
            <p className="mt-4 text-ink-secondary">Loading fraud alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <p className="text-lg font-medium text-ink">No alerts found</p>
            <p className="text-ink-secondary">
              {filter !== 'all' ? 'Try changing filters' : 'Your listings are safe!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className="bg-surface border border-surface-border rounded-lg shadow-sm hover:shadow-md transition border-l-4"
                style={{
                  borderColor:
                    alert.severity === 'critical'
                      ? '#dc2626'
                      : alert.severity === 'high'
                        ? '#ea580c'
                        : alert.severity === 'medium'
                          ? '#eab308'
                          : '#3b82f6',
                }}
              >
                <div className="p-4">
                  {/* Alert Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-ink">{alert.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-surface-subtle text-ink-secondary border border-surface-border">
                            {getAlertTypeLabel(alert.alert_type)}
                          </span>
                        </div>
                        <p className="text-sm text-ink-secondary">{alert.description}</p>
                        <div className="mt-2 text-xs text-ink-muted">
                          Created {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                        className="p-2 hover:bg-surface-hover rounded transition text-ink-secondary"
                      >
                        {expandedAlert === alert.id ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      {alert.status !== 'dismissed' && (
                        <button
                          onClick={() => void updateAlertStatus(alert.id, 'dismissed')}
                          className="p-2 hover:bg-surface-hover rounded transition text-ink-muted"
                          title="Dismiss alert"
                        >
                          <EyeOff className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="mt-4 flex items-center gap-4 pt-4 border-t border-surface-border">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(alert.status)}
                      <span className="text-sm font-medium text-ink-secondary">
                        Status:
                      </span>
                    </div>
                    <select
                      value={alert.status}
                      onChange={e => updateAlertStatus(alert.id, e.target.value as FraudAlert['status'])}
                      className="px-3 py-1 border border-border rounded bg-input-background text-sm text-ink outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>

                    {alert.resolved_at && (
                      <span className="text-xs text-ink-muted ml-auto">
                        Resolved {new Date(alert.resolved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Expanded Evidence */}
                  {expandedAlert === alert.id && alert.evidence && (
                    <div className="mt-4 pt-4 border-t border-surface-border">
                      <h4 className="text-sm font-medium text-ink mb-2">Evidence</h4>
                      <pre className="bg-surface-subtle border border-surface-border p-3 rounded text-xs overflow-auto max-h-60 text-ink">
                        {JSON.stringify(alert.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  color,
  iconColor,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  iconColor: string
}) {
  return (
    <div className={`${color} rounded-lg p-4 shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`${iconColor} opacity-75`}>{icon}</div>
      </div>
    </div>
  )
}
