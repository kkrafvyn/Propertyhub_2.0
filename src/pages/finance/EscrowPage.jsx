import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { fetchEscrowAccounts } from '../../services/finance-service'
import { fundEscrow } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Escrow() {
  const [params] = useSearchParams()
  const [escrow, setEscrow] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(params.get('funded') ? 'Escrow deposit recorded.' : '')

  useEffect(() => {
    fetchEscrowAccounts().then(({ escrow: rows }) => setEscrow(rows))
  }, [])

  async function handleFund(account) {
    const remaining = account.amount - account.funded
    if (remaining <= 0) return
    setLoading(account.id)
    setMessage('')
    const result = await fundEscrow({ escrowId: account.id, amount: remaining, provider })
    if (result.checkout_url) return
    setMessage(result.message || 'Escrow deposit initiated.')
    setLoading(null)
  }

  return (
    <FinanceShell title="Escrow platform" subtitle="Secure buyer deposits held until closing conditions are met">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand-light px-4 py-3 text-sm text-brand-dark">{message}</p>
      )}

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Payment provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
      </div>

      <div className="space-y-4">
        {escrow.map((e) => {
          const pct = Math.round((e.funded / e.amount) * 100)
          const remaining = e.amount - e.funded
          return (
            <article key={e.id} className="rounded-card border border-surface-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{e.property}</h2>
                  <p className="text-sm text-ink-secondary">Buyer: {e.buyer}</p>
                </div>
                <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold capitalize text-brand-dark">{e.status}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>GHS {e.funded.toLocaleString()} funded</span>
                  <span className="text-ink-secondary">of GHS {e.amount.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFund(e)}
                  disabled={loading === e.id}
                  className="mt-4 rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-brand disabled:opacity-60"
                >
                  {loading === e.id ? 'Redirecting…' : `Fund GHS ${remaining.toLocaleString()} via ${provider}`}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </FinanceShell>
  )
}

export default function EscrowPage() {
  return <ProtectedRoute><Escrow /></ProtectedRoute>
}
