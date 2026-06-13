import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchMortgages } from '../../services/finance-service'

function Mortgages() {
  const [mortgages, setMortgages] = useState([])

  useEffect(() => {
    fetchMortgages().then(({ mortgages: rows }) => setMortgages(rows))
  }, [])

  return (
    <FinanceShell title="Mortgage marketplace" subtitle="Compare partner lenders and apply in-app">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mortgages.map((m) => (
          <article key={m.id} className="rounded-card border border-surface-border bg-surface p-5">
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">{m.badge}</span>
            <h2 className="mt-3 font-semibold">{m.lender}</h2>
            <p className="text-2xl font-bold text-brand-dark">{m.rate}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-secondary">
              <li>Max LTV: {m.maxLtv}</li>
              <li>Term: {m.term}</li>
              <li>Min: GHS {m.minAmount.toLocaleString()}</li>
            </ul>
            <button type="button" className="mt-4 text-sm font-semibold text-brand-dark underline">Apply</button>
          </article>
        ))}
      </div>
      <Link to="/tools/mortgage" className="mt-6 inline-block text-sm font-semibold text-brand-dark underline">
        Use mortgage calculator →
      </Link>
    </FinanceShell>
  )
}

export default function MortgageMarketplacePage() {
  return <ProtectedRoute><Mortgages /></ProtectedRoute>
}
