import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchFraudAlerts, fetchFraudRules, scoreFraudAlert, updateFraudStatus, runFraudScan } from '../../services/trust-service'

function Fraud() {
  const { t } = useTranslation()
  const [alerts, setAlerts] = useState([])
  const [rules, setRules] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  useEffect(() => {
    Promise.all([fetchFraudAlerts(), fetchFraudRules()]).then(([a, r]) => {
      setAlerts(a.alerts)
      setRules(r.rules)
    })
  }, [])

  async function handleResolve(id) {
    await updateFraudStatus(id, 'resolved')
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)))
  }

  async function handleScan() {
    setScanning(true)
    setScanMsg('')
    const result = await runFraudScan(true)
    setScanMsg(t('extensions.fraud.scanResult', { scanned: result.scanned ?? 0, created: result.alerts_created ?? 0 }))
    const { alerts: rows } = await fetchFraudAlerts()
    setAlerts(rows)
    setScanning(false)
  }

  return (
    <AdminShell titleKey="hubs.admin.fraud.title" subtitleKey="hubs.admin.fraud.subtitle">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleScan} disabled={scanning} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {scanning ? t('extensions.fraud.scanning') : t('extensions.fraud.runScan')}
        </button>
        {scanMsg && <p className="text-sm text-ink-secondary">{scanMsg}</p>}
      </div>
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{t('extensions.fraud.rulesTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <article key={rule.id} className="panel-card bg-surface-subtle p-4">
              <p className="font-semibold">{rule.name}</p>
              <p className="mt-1 text-xs text-ink-secondary">{rule.description}</p>
              <p className="mt-2 text-sm">
                {t('extensions.fraud.threshold')}: <strong>{rule.threshold}</strong>
              </p>
            </article>
          ))}
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t('extensions.fraud.alertsTitle')}</h2>
      <div className="space-y-3">
        {alerts.map((a) => {
          const score = scoreFraudAlert(a, rules)
          return (
            <article key={a.id} className="panel-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.target}</p>
                  <p className="text-sm text-ink-secondary capitalize">{(a.alert_type || a.type || '').replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-ink">{score}</p>
                  <p className="text-xs text-ink-secondary">{t('extensions.fraud.riskScore')}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-block rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize">{a.status}</span>
                {a.status !== 'resolved' && (
                  <button type="button" onClick={() => handleResolve(a.id)} className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white">
                    {t('extensions.fraud.resolve')}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </AdminShell>
  )
}

export default function AdminFraudPage() {
  return <ProtectedRoute><Fraud /></ProtectedRoute>
}
