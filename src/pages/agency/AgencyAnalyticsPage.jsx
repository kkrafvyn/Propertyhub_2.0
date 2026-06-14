import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAgencyAnalytics } from '../../services/agency-service'

function Analytics() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAgencyAnalytics().then(({ analytics }) => setData(analytics))
  }, [])

  if (!data) return null

  const kpis = [
    { label: 'Revenue MTD', value: `GHS ${data.revenueMtd.toLocaleString()}` },
    { label: 'Revenue YTD', value: `GHS ${data.revenueYtd.toLocaleString()}` },
    { label: 'Closed deals', value: data.closedDeals },
    { label: 'Avg commission', value: `GHS ${data.avgCommission.toLocaleString()}` },
    { label: 'Lead conversion', value: data.leadConversion },
  ]

  return (
    <AgencyShell titleKey="hubs.agency.analytics.title" subtitleKey="hubs.agency.analytics.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(({ label, value }) => (
          <div key={label} className="panel-card bg-surface p-4">
            <p className="text-xs text-ink-secondary">{label}</p>
            <p className="mt-1 text-xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel-card bg-surface p-5">
          <h3 className="font-semibold">Monthly revenue</h3>
          <div className="mt-4 space-y-3">
            {data.revenueByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-8 text-xs text-ink-secondary">{m.month}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(m.revenue / 300000) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-medium">GHS {(m.revenue / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card bg-surface p-5">
          <h3 className="font-semibold">Top agents</h3>
          <ul className="mt-4 space-y-3">
            {data.topAgents.map((a, i) => (
              <li key={a.name} className="flex items-center justify-between text-sm">
                <span>{i + 1}. {a.name}</span>
                <span className="font-semibold text-ink">GHS {a.revenue.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AgencyShell>
  )
}

export default function AgencyAnalyticsPage() {
  return <ProtectedRoute><Analytics /></ProtectedRoute>
}
