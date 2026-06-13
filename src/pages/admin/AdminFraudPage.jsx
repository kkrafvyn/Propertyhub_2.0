import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchFraudAlerts, updateFraudStatus } from '../../services/trust-service'

function Fraud() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    fetchFraudAlerts().then(({ alerts: rows }) => setAlerts(rows))
  }, [])

  async function handleResolve(id) {
    await updateFraudStatus(id, 'resolved')
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)))
  }

  return (
    <AdminShell title="Fraud detection & risk scores" subtitle="Automated anomaly detection across listings and users">
      <div className="space-y-3">
        {alerts.map((a) => (
          <article key={a.id} className="rounded-card border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{a.target}</p>
                <p className="text-sm text-white/70 capitalize">{(a.alert_type || a.type || '').replace('_', ' ')}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand">{a.riskScore ?? a.risk_score}</p>
                <p className="text-xs text-white/50">Risk score</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize">{a.status}</span>
              {a.status !== 'resolved' && (
                <button type="button" onClick={() => handleResolve(a.id)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-dark">
                  Resolve
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  )
}

export default function AdminFraudPage() {
  return <ProtectedRoute><Fraud /></ProtectedRoute>
}
