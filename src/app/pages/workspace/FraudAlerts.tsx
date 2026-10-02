import React, { useEffect, useState, useMemo } from 'react'
import {
  AlertCircle,
  TrendingUp,
  Shield,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Zap,
  FileSearch,
  Copy,
  Ban,
  ShieldAlert,
  X,
  Fingerprint,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import {
  enhancedFraudDetectionService,
  type FraudScanSummary,
} from '@/lib/enhanced-fraud-detection.service'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityConfig(s: FraudAlert['severity']) {
  switch (s) {
    case 'critical': return { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800', accentBar: 'bg-red-500', dot: 'bg-red-500' }
    case 'high':     return { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800', accentBar: 'bg-orange-500', dot: 'bg-orange-500' }
    case 'medium':   return { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', accentBar: 'bg-amber-400', dot: 'bg-amber-400' }
    default:         return { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900', accentBar: 'bg-blue-400', dot: 'bg-blue-400' }
  }
}

function statusConfig(s: FraudAlert['status']) {
  switch (s) {
    case 'active':       return { icon: <Clock className="w-3 h-3" />, label: 'Active', cls: 'bg-red-500/10 text-red-700 border-red-200' }
    case 'investigating': return { icon: <Eye className="w-3 h-3" />, label: 'Investigating', cls: 'bg-amber-500/10 text-amber-700 border-amber-200' }
    case 'resolved':     return { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Resolved', cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' }
    case 'dismissed':    return { icon: <EyeOff className="w-3 h-3" />, label: 'Dismissed', cls: 'bg-muted text-muted-foreground border-border' }
  }
}

const ALERT_LABELS: Record<FraudAlert['alert_type'], string> = {
  duplicate_listing: 'Duplicate Listing',
  suspicious_lead: 'Suspicious Lead',
  price_mismatch: 'Price Mismatch',
  image_reuse: 'Image Reuse',
  fake_listing: 'Fake Listing',
  scam_pattern: 'Scam Pattern',
}

const ALERT_ICONS: Record<FraudAlert['alert_type'], React.ReactNode> = {
  duplicate_listing: <Copy className="w-4 h-4" />,
  suspicious_lead: <Fingerprint className="w-4 h-4" />,
  price_mismatch: <Tag className="w-4 h-4" />,
  image_reuse: <FileSearch className="w-4 h-4" />,
  fake_listing: <Ban className="w-4 h-4" />,
  scam_pattern: <ShieldAlert className="w-4 h-4" />,
}

// ── Metric card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent }: { label: string; value: number | string; sub?: string; icon: React.ReactNode; accent?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${accent ?? 'bg-muted/50'}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
}

// ── Evidence viewer ───────────────────────────────────────────────────────────

function EvidencePanel({ evidence }: { evidence: any }) {
  if (!evidence) return <p className="text-xs text-muted-foreground italic">No evidence data attached.</p>

  if (typeof evidence === 'object') {
    const entries = Object.entries(evidence)
    if (entries.length === 0) return <p className="text-xs text-muted-foreground italic">Empty evidence object.</p>

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <p className="text-muted-foreground capitalize mb-0.5">{k.replace(/_/g, ' ')}</p>
              <p className="font-mono font-medium truncate">{String(v)}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-auto max-h-40 text-foreground">
      {String(evidence)}
    </pre>
  )
}

// ── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onStatusChange,
}: {
  alert: FraudAlert
  onStatusChange: (id: string, status: FraudAlert['status']) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sev = severityConfig(alert.severity)
  const sta = statusConfig(alert.status)

  return (
    <div className={`rounded-xl border ${sev.border} overflow-hidden transition-all hover:shadow-md`}>
      {/* Left severity accent bar */}
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${sev.accentBar}`} />
        <div className="flex-1">
          {/* Header */}
          <button
            className="w-full flex items-start gap-3 p-4 hover:bg-muted/20 text-left transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {/* Type icon */}
            <div className={`p-2 rounded-xl flex-shrink-0 ${sev.bg} ${sev.text}`}>
              {ALERT_ICONS[alert.alert_type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{alert.title}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border ${sev.bg} ${sev.text} ${sev.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                  {ALERT_LABELS[alert.alert_type]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Detected {new Date(alert.created_at).toLocaleString()}
              </p>
            </div>

            {/* Status + expand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border ${sta.cls}`}>
                {sta.icon} {sta.label}
              </span>
              {expanded
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
              }
            </div>
          </button>

          {/* Expanded body */}
          {expanded && (
            <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/10 space-y-4">
              {/* Evidence */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Evidence</p>
                <EvidencePanel evidence={alert.evidence} />
              </div>

              {/* Investigation actions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'investigating', 'resolved', 'dismissed'] as FraudAlert['status'][]).map((s) => {
                    const cfg = statusConfig(s)
                    const isActive = alert.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => onStatusChange(alert.id, s)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                          ${isActive
                            ? `${cfg.cls} shadow-sm ring-2 ring-offset-1 ring-current`
                            : 'bg-background border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'}`}
                      >
                        {cfg.icon} {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Resolution timestamp */}
              {alert.resolved_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Resolved on {new Date(alert.resolved_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Scan summary banner ───────────────────────────────────────────────────────

function ScanSummaryBanner({ summary }: { summary: FraudScanSummary }) {
  return (
    <Card className="p-4 bg-indigo-500/5 border-indigo-200 dark:border-indigo-900">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-indigo-600" />
        <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">Latest Scan Summary</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          { label: 'Duplicate Listings', value: summary.duplicateListings },
          { label: 'Suspicious Leads', value: summary.suspiciousLeads },
          { label: 'Image Issues', value: summary.imageIssues },
          { label: 'New Alerts', value: summary.totalAlertsCreated },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-background border border-indigo-100 dark:border-indigo-900 px-3 py-2">
            <p className="text-muted-foreground">{item.label}</p>
            <p className="font-bold text-lg">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['all', 'active', 'investigating', 'resolved', 'dismissed'] as const
const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'] as const

export function FraudAlerts({ organizationId }: { organizationId: string }) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [scanSummary, setScanSummary] = useState<FraudScanSummary | null>(null)
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('active')
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_FILTERS[number]>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => { void loadAlerts() }, [organizationId])

  async function loadAlerts() {
    setLoading(true)
    try {
      const data = await enhancedFraudDetectionService.getFraudAlerts(organizationId, undefined, 200)
      setAlerts(data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleScan() {
    setScanning(true)
    try {
      const summary = await enhancedFraudDetectionService.runComprehensiveFraudScan(organizationId)
      setScanSummary(summary)
      await loadAlerts()
    } catch (e) {
      console.error(e)
    } finally {
      setScanning(false)
    }
  }

  async function handleStatusChange(alertId: string, newStatus: FraudAlert['status']) {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === alertId
          ? { ...a, status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : a.resolved_at }
          : a
      )
      return next
    })
    try {
      await enhancedFraudDetectionService.updateAlertStatus(alertId, newStatus)
    } catch {
      void loadAlerts()
    }
  }

  const filtered = useMemo(() =>
    alerts.filter((a) => {
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      const matchSev = severityFilter === 'all' || a.severity === severityFilter
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchSev && matchSearch
    }),
    [alerts, statusFilter, severityFilter, search]
  )

  // Metrics
  const critical = alerts.filter((a) => a.severity === 'critical').length
  const high = alerts.filter((a) => a.severity === 'high').length
  const active = alerts.filter((a) => a.status === 'active' || a.status === 'investigating').length
  const resolved = alerts.filter((a) => a.status === 'resolved').length
  const resolvedRate = alerts.length > 0 ? Math.round((resolved / alerts.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/10">
              <Shield className="h-5 w-5 text-red-600" />
            </span>
            Fraud Detection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered monitoring for duplicate listings, scam patterns &amp; suspicious leads.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleScan} disabled={scanning}
            className="bg-red-600 hover:bg-red-700 text-white">
            {scanning
              ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Scanning…</>
              : <><Zap className="w-4 h-4 mr-1.5" />Run Scan</>
            }
          </Button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Alerts" value={alerts.length} icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />} accent="bg-muted/50" />
        <StatCard label="Critical" value={critical} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} accent="bg-red-500/10" sub={`+ ${high} high`} />
        <StatCard label="Active / Investigating" value={active} icon={<Eye className="w-5 h-5 text-amber-600" />} accent="bg-amber-500/10" />
        <StatCard label="Resolved Rate" value={`${resolvedRate}%`} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-500/10" sub={`${resolved} of ${alerts.length}`} />
      </div>

      {/* Scan summary */}
      {scanSummary && <ScanSummaryBanner summary={scanSummary} />}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search alerts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Status pills */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all
                ${statusFilter === f ? 'bg-foreground text-background border-foreground' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Severity pills */}
        <div className="flex gap-1 flex-wrap">
          {SEVERITY_FILTERS.map((f) => {
            const colorMap: Record<string, string> = { critical: 'bg-red-600 border-red-600 text-white', high: 'bg-orange-500 border-orange-500 text-white', medium: 'bg-amber-400 border-amber-400 text-white', low: 'bg-blue-500 border-blue-500 text-white', all: 'bg-foreground text-background border-foreground' }
            return (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all
                  ${severityFilter === f ? colorMap[f] : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'}`}
              >
                {f}
              </button>
            )
          })}
        </div>

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {filtered.length} / {alerts.length} shown
        </span>
      </div>

      {/* ── Alert list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Shield className="w-12 h-12 mx-auto text-emerald-500/60" />
          <p className="font-semibold">
            {statusFilter !== 'all' || severityFilter !== 'all' || search
              ? 'No alerts match your filters'
              : 'All clear — no fraud alerts'}
          </p>
          <p className="text-sm text-muted-foreground">
            {statusFilter !== 'all' || severityFilter !== 'all' || search
              ? 'Try adjusting your filters above.'
              : 'Run a scan to check your portfolio for suspicious activity.'}
          </p>
          <Button size="sm" className="mx-auto bg-red-600 hover:bg-red-700 text-white" onClick={handleScan} disabled={scanning}>
            <Zap className="w-4 h-4 mr-1.5" /> Run Scan
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
