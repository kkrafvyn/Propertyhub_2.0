import { useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
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
    <IntelligenceShell titleKey="hubs.intelligence.hub.title" subtitleKey="hubs.intelligence.hub.subtitle">
      {summary && (
        <StatGrid>
          <StatCard label="Median price" value={`GHS ${(summary.medianPrice / 1000000).toFixed(2)}M`} />
          <StatCard label="YoY change" value={summary.priceChangeYoY} />
          <StatCard label="Avg days on market" value={summary.avgDaysOnMarket} />
          <StatCard label="Transactions (6mo)" value={summary.transactionVolume} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </IntelligenceShell>
  )
}

export default function IntelligenceHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
