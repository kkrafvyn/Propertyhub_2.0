import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchRevenueForecast } from '../../services/enterprise-service'

function Forecast() {
  const [forecast, setForecast] = useState([])

  useEffect(() => {
    fetchRevenueForecast().then(({ forecast: rows }) => setForecast(rows))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.forecast.title" subtitleKey="hubs.enterprise.forecast.subtitle">
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Quarter</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
              <th className="px-4 py-3 font-semibold">Expenses</th>
              <th className="px-4 py-3 font-semibold">NOI</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((f) => (
              <tr key={f.quarter} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{f.quarter}</td>
                <td className="px-4 py-3">GHS {(f.revenue / 1000000).toFixed(0)}M</td>
                <td className="px-4 py-3 text-ink-secondary">GHS {(f.expenses / 1000000).toFixed(0)}M</td>
                <td className="px-4 py-3 font-bold text-ink">GHS {(f.noi / 1000000).toFixed(0)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EnterpriseShell>
  )
}

export default function EnterpriseForecastPage() {
  return <ProtectedRoute><Forecast /></ProtectedRoute>
}
