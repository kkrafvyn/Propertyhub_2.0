import { Link } from 'react-router-dom'
import { useState } from 'react'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { financingPartners } from '../../data/buyer'
import { applyMortgageReferral } from '../../services/finance-service'

function FinancingCenterContent() {
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('750000')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleApply() {
    if (!selected) return
    setLoading(true)
    setMessage('')
    const result = await applyMortgageReferral({
      partnerId: selected.id,
      listingId: null,
      amount: Number(amount) || 0,
      metadata: { partner: selected.name },
    })
    setMessage(result?.ok ? `Pre-qualification submitted with ${selected.name}.` : result?.error ?? 'Could not submit.')
    setLoading(false)
    setSelected(null)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold lg:hidden">Financing center</h1>
      <p className="mt-1 text-ink-secondary lg:hidden">Mortgages, pre-qualification, and partner banks.</p>

      {message && (
        <p className="mt-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink lg:mt-6">{message}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3">
        {financingPartners.map((p) => (
          <article key={p.id} className="panel-card bg-surface p-5">
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-ink">{p.badge}</span>
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.type}</p>
            <p className="mt-2 font-medium text-ink">{p.rate}</p>
            <button type="button" onClick={() => setSelected(p)} className="mt-4 text-sm font-semibold text-ink underline">Apply</button>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link to="/tools/mortgage" className="panel-card bg-surface-subtle p-6 hover:shadow-card">
          <h3 className="font-semibold">Mortgage estimator</h3>
          <p className="mt-1 text-sm text-ink-secondary">Calculate monthly payments</p>
        </Link>
        <Link to="/tools/investment" className="panel-card bg-surface-subtle p-6 hover:shadow-card">
          <h3 className="font-semibold">Investment calculator</h3>
          <p className="mt-1 text-sm text-ink-secondary">Cap rate, ROI, and 5-year projections</p>
        </Link>
      </div>

      {selected && (
        <QuickFormModal title={`Apply — ${selected.name}`} onClose={() => setSelected(null)} onSubmit={handleApply} submitLabel="Submit" loading={loading}>
          <ModalField label="Estimated purchase price (GHS)">
            <input type="number" className={modalInputClassName()} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </ModalField>
        </QuickFormModal>
      )}
    </>
  )
}

function FinancingCenterLayout() {
  return (
    <ResponsivePageShell titleKey="hubs.buyer.financingCenter.title">
      <FinancingCenterContent />
    </ResponsivePageShell>
  )
}

export default function FinancingCenterPage() {
  return <ProtectedRoute><FinancingCenterLayout /></ProtectedRoute>
}
