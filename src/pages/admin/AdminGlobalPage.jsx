import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchGlobalRegions } from '../../services/trust-service'
import { fetchMarketRegions } from '../../services/platform-service'

const statusStyles = {
  live: 'bg-green-500/20 text-green-300',
  beta: 'bg-surface-hover text-ink',
  planned: 'bg-white/10 text-white/50',
}

function Global() {
  const [regions, setRegions] = useState([])
  const [marketRegions, setMarketRegions] = useState([])

  useEffect(() => {
    fetchGlobalRegions().then(({ regions: rows }) => setRegions(rows))
    fetchMarketRegions().then(({ regions: rows }) => setMarketRegions(rows ?? []))
  }, [])

  return (
    <AdminShell titleKey="hubs.admin.global.title" subtitleKey="hubs.admin.global.subtitle">
      <div className="overflow-hidden panel-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Currency</th>
              <th className="px-4 py-3 font-semibold">Listings</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.code} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 font-mono">{r.code}</td>
                <td className="px-4 py-3">{r.currency}</td>
                <td className="px-4 py-3">{(r.listings ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[r.status] || statusStyles.planned}`}>
                    {r.status ?? (r.active === false ? 'planned' : 'live')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {marketRegions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Market tiers (plugin architecture)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {marketRegions.map((r) => (
              <article key={r.id} className="panel-card bg-surface-subtle p-4">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-ink-secondary">
                  Phase {r.launch_phase} · {r.default_currency} · {r.tier ?? r.config?.utility_mode ?? 'configured'}
                </p>
                {r.tagline && <p className="mt-1 text-xs text-ink-secondary">{r.tagline}</p>}
              </article>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-ink-secondary">
        Payment plugins: Paystack (Africa) · Razorpay (India) · Stripe (US/EU). Utility & compliance adapters load per region via <code className="text-xs">/platform</code>.
      </p>
    </AdminShell>
  )
}

export default function AdminGlobalPage() {
  return <ProtectedRoute><Global /></ProtectedRoute>
}
