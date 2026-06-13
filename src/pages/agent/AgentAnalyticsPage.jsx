import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAnalytics } from '../../services/agent-service'

function Analytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchAnalytics().then(({ analytics }) => setStats(analytics))
  }, [])

  if (!stats) return null

  const cards = [
    { label: 'Listing views', value: stats.listingViews.toLocaleString() },
    { label: 'Inquiries', value: stats.inquiries },
    { label: 'Viewings', value: stats.viewings },
    { label: 'Offers', value: stats.offers },
    { label: 'Close rate', value: stats.closeRate },
    { label: 'Avg days on market', value: stats.avgDaysOnMarket },
  ]

  return (
    <AgentShell title="Analytics" subtitle="Performance across listings and leads">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value }) => (
          <div key={label} className="rounded-card border border-surface-border bg-surface p-5">
            <p className="text-sm text-ink-secondary">{label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-dark">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-secondary">Top listing: <span className="font-semibold text-ink">{stats.topListing}</span></p>
    </AgentShell>
  )
}

export default function AgentAnalyticsPage() {
  return <ProtectedRoute><Analytics /></ProtectedRoute>
}
