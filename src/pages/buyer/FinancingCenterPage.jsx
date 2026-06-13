import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { financingPartners } from '../../data/buyer'

function FinancingCenter() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Financing center</h1>
      <p className="mt-1 text-ink-secondary">Mortgages, pre-qualification, and partner banks.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {financingPartners.map((p) => (
          <article key={p.id} className="rounded-card border border-surface-border bg-surface p-5">
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">{p.badge}</span>
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.type}</p>
            <p className="mt-2 font-medium text-brand-dark">{p.rate}</p>
            <button type="button" className="mt-4 text-sm font-semibold text-brand-dark underline">Apply</button>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link to="/tools/mortgage" className="rounded-card border border-surface-border bg-surface-subtle p-6 hover:shadow-card">
          <h3 className="font-semibold">Mortgage estimator</h3>
          <p className="mt-1 text-sm text-ink-secondary">Calculate monthly payments</p>
        </Link>
        <Link to="/tools/investment" className="rounded-card border border-surface-border bg-surface-subtle p-6 hover:shadow-card">
          <h3 className="font-semibold">Investment calculator</h3>
          <p className="mt-1 text-sm text-ink-secondary">Cap rate, ROI, and 5-year projections</p>
        </Link>
      </div>
    </DesktopShell>
  )
}

export default function FinancingCenterPage() {
  return <ProtectedRoute><FinancingCenter /></ProtectedRoute>
}
