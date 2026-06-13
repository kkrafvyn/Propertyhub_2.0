import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchFinanceDashboard } from '../../services/finance-service'
import { rentCollectionRails } from '../../data/finance'

const links = [
  { to: '/finance/mortgages', label: 'Mortgage marketplace', desc: 'Partner banks and pre-qualification' },
  { to: '/finance/escrow', label: 'Escrow platform', desc: 'Secure transaction deposits' },
  { to: '/finance/rent-collection', label: 'Rent collection', desc: 'Paystack & Stripe payment rails' },
  { to: '/finance/insurance', label: 'Insurance marketplace', desc: 'Home, landlord, and tenant cover' },
  { to: '/finance/commissions', label: 'Commission settlement', desc: 'Agent payout automation' },
  { to: '/tools/mortgage', label: 'Mortgage calculator', desc: 'Estimate monthly payments' },
]

function FinanceHub() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchFinanceDashboard().then(({ summary: s }) => setSummary(s))
  }, [])

  return (
    <FinanceShell title="Financial services" subtitle="Payments powered by Paystack (Africa) and Stripe (international)">
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Escrow funded" value={`GHS ${summary.escrowTotal?.toLocaleString()}`} />
          <Stat label="Pending commissions" value={summary.pendingCommissions} />
          <Stat label="Mortgage partners" value={summary.mortgagePartners} />
        </div>
      )}

      <div className="mb-8 rounded-card border border-brand/30 bg-brand-light p-4">
        <p className="text-sm font-semibold text-brand-dark">Payment providers</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-brand-dark">
          <span>🇬🇭 {rentCollectionRails.paystack.label} — {rentCollectionRails.paystack.methods.join(', ')}</span>
          <span>🌍 {rentCollectionRails.stripe.label} — {rentCollectionRails.stripe.methods.join(', ')}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, desc }) => (
          <Link key={to} to={to} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-sm text-ink-secondary">{desc}</p>
          </Link>
        ))}
      </div>
    </FinanceShell>
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

export default function FinanceHubPage() {
  return <ProtectedRoute><FinanceHub /></ProtectedRoute>
}
