import { useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchMarketData } from '../../services/intelligence-service'

function Market() {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState([])

  useEffect(() => {
    fetchMarketData().then(({ summary: s, trends: t }) => { setSummary(s); setTrends(t) })
  }, [])

  return (
    <IntelligenceShell titleKey="hubs.intelligence.marketIntelligence.title" subtitle={summary?.region || 'Greater Accra'}>
      {summary && (
        <div className="mb-6 flex flex-wrap gap-2">
          {summary.hotZones?.map((z) => (
            <span key={z} className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-ink">{z}</span>
          ))}
        </div>
      )}
      <div className="panel-card bg-surface p-5">
        <h3 className="font-semibold">Median price trend</h3>
        <div className="mt-4 space-y-3">
          {trends.map((t) => (
            <div key={t.month} className="flex items-center gap-3">
              <span className="w-8 text-xs text-ink-secondary">{t.month}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                <div className="h-full rounded-full bg-brand-accent" style={{ width: `${(t.median / 3000000) * 100}%` }} />
              </div>
              <span className="w-24 text-right text-xs font-medium">GHS {(t.median / 1000000).toFixed(2)}M</span>
              <span className="w-12 text-right text-xs text-ink-secondary">{t.volume}</span>
            </div>
          ))}
        </div>
      </div>
    </IntelligenceShell>
  )
}

export default function MarketIntelligencePage() {
  return <ProtectedRoute><Market /></ProtectedRoute>
}
