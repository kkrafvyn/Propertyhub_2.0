import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchPortfolios } from '../../services/enterprise-service'

function Portfolios() {
  const [portfolios, setPortfolios] = useState([])

  useEffect(() => {
    fetchPortfolios().then(({ portfolios: rows }) => setPortfolios(rows))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.portfolios.title" subtitleKey="hubs.enterprise.portfolios.subtitle">
      <div className="grid gap-4 sm:grid-cols-2">
        {portfolios.map((p) => (
          <article key={p.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold text-ink">{p.country}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{p.value}</p>
            <div className="mt-3 flex gap-4 text-sm text-ink-secondary">
              <span>{p.assets} assets</span>
              <span>Yield {p.yield}</span>
              <span className="capitalize">Risk: {p.risk}</span>
            </div>
          </article>
        ))}
      </div>
    </EnterpriseShell>
  )
}

export default function EnterprisePortfoliosPage() {
  return <ProtectedRoute><Portfolios /></ProtectedRoute>
}
