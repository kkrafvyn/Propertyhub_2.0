import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { fetchCommissionSettlements } from '../../services/finance-service'
import { settleCommission } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Commissions() {
  const [params] = useSearchParams()
  const [settlements, setSettlements] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(params.get('settled') ? 'Commission settlement recorded.' : '')

  useEffect(() => {
    fetchCommissionSettlements().then(({ settlements: rows }) => setSettlements(rows))
  }, [])

  async function handleSettle(s) {
    if (s.status === 'paid') return
    setLoading(s.id)
    setMessage('')
    const result = await settleCommission({
      settlementId: s.id,
      amount: s.amount,
      provider: s.provider || provider,
    })
    if (result.checkout_url) return
    setMessage(result.message || 'Settlement initiated.')
    setLoading(null)
  }

  return (
    <FinanceShell title="Commission settlement" subtitle="Pay agents via Paystack or Stripe payout rails">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-3 text-sm text-brand-dark">{message}</p>
      )}

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Default payout provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
      </div>

      <div className="space-y-3">
        {settlements.map((s) => (
          <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{s.agent}</p>
              <p className="text-sm text-ink-secondary">{s.property} · via {s.provider}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-brand-dark">GHS {s.amount.toLocaleString()}</span>
              {s.status === 'paid' ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Paid {s.paidAt}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSettle(s)}
                  disabled={loading === s.id}
                  className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-brand disabled:opacity-60"
                >
                  {loading === s.id ? '…' : 'Settle'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </FinanceShell>
  )
}

export default function CommissionSettlementPage() {
  return <ProtectedRoute><Commissions /></ProtectedRoute>
}
