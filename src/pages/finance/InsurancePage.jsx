import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchInsuranceProducts } from '../../services/finance-service'

function Insurance() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchInsuranceProducts().then(({ products: rows }) => setProducts(rows))
  }, [])

  return (
    <FinanceShell titleKey="hubs.finance.insurance.title" subtitleKey="hubs.finance.insurance.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <article key={p.id} className="panel-card bg-surface p-5">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.provider}</p>
            <p className="mt-2 font-bold text-ink">{p.premium}</p>
            <p className="mt-2 text-sm text-ink-secondary">{p.coverage}</p>
            <button type="button" className="mt-4 rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold hover:bg-surface-subtle">
              Get quote
            </button>
          </article>
        ))}
      </div>
    </FinanceShell>
  )
}

export default function InsurancePage() {
  return <ProtectedRoute><Insurance /></ProtectedRoute>
}
