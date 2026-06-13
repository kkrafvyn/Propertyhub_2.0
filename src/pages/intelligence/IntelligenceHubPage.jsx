import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchIntelligenceDashboard } from '../../services/intelligence-service'

const links = [
  { to: '/intelligence/market', label: 'Market data', desc: 'Price trends and transaction volume' },
  { to: '/intelligence/heatmap', label: 'Price heatmap', desc: 'Geographic demand intensity' },
  { to: '/intelligence/valuation', label: 'AI valuation', desc: 'Instant property estimates' },
  { to: '/neighborhoods', label: 'Neighborhood scores', desc: 'Schools, safety, growth' },
  { to: '/tools/investment', label: 'ROI calculator', desc: 'Cap rate and projections' },
]

function Hub() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchIntelligenceDashboard().then(({ summary: s }) => setSummary(s))
  }, [])

  return (
    <IntelligenceShell title="Real estate intelligence" subtitle="Market data, heatmaps, and AI valuation for Ghana">
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Median price" value={`GHS ${(summary.medianPrice / 1000000).toFixed(2)}M`} />
          <Stat label="YoY change" value={summary.priceChangeYoY} />
          <Stat label="Avg days on market" value={summary.avgDaysOnMarket} />
          <Stat label="Transactions (6mo)" value={summary.transactionVolume} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </Link>
        ))}
      </div>
    </IntelligenceShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  )
}

export default function IntelligenceHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
