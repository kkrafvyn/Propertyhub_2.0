import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { IconChevronRight } from '../../components/icons'
import { fetchMortgages, applyMortgageReferral } from '../../services/finance-service'

function Mortgages() {
  const [mortgages, setMortgages] = useState([])
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('500000')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchMortgages().then(({ mortgages: rows }) => setMortgages(rows))
  }, [])

  async function handleApply() {
    if (!selected) return
    setLoading(true)
    setMessage('')
    const result = await applyMortgageReferral({
      partnerId: selected.id,
      listingId: null,
      amount: Number(amount) || selected.minAmount || 0,
      metadata: { lender: selected.lender },
    })
    setMessage(result?.ok ? `Application submitted to ${selected.lender}. Reference: ${result.referral_id ?? 'pending'}` : result?.error ?? 'Could not submit application.')
    setLoading(false)
    setSelected(null)
  }

  return (
    <FinanceShell titleKey="hubs.finance.mortgageMarketplace.title" subtitleKey="hubs.finance.mortgageMarketplace.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mortgages.map((m) => (
          <article key={m.id} className="panel-card bg-surface p-5">
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold text-ink">{m.badge}</span>
            <h2 className="mt-3 font-semibold">{m.lender}</h2>
            <p className="text-2xl font-bold text-ink">{m.rate}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-secondary">
              <li>Max LTV: {m.maxLtv}</li>
              <li>Term: {m.term}</li>
              <li>Min: GHS {m.minAmount.toLocaleString()}</li>
            </ul>
            <button type="button" onClick={() => { setSelected(m); setAmount(String(m.minAmount || 500000)) }} className="mt-4 text-sm font-semibold text-ink underline">Apply</button>
          </article>
        ))}
      </div>
      <Link to="/tools/mortgage" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-ink underline">
        Use mortgage calculator
        <IconChevronRight className="h-3.5 w-3.5" />
      </Link>

      {selected && (
        <QuickFormModal title={`Apply — ${selected.lender}`} onClose={() => setSelected(null)} onSubmit={handleApply} submitLabel="Submit application" loading={loading}>
          <ModalField label="Loan amount (GHS)">
            <input type="number" className={modalInputClassName()} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </ModalField>
          <p className="text-xs text-ink-secondary">We share your pre-qualification request with {selected.lender}. A partner may contact you within 2 business days.</p>
        </QuickFormModal>
      )}
    </FinanceShell>
  )
}

export default function MortgageMarketplacePage() {
  return <ProtectedRoute><Mortgages /></ProtectedRoute>
}
