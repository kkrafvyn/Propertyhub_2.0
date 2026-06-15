import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { fetchEscrowAccounts } from '../../services/finance-service'
import { fundEscrow } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

const milestoneStyles = {
  funded: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-surface-subtle text-ink-secondary',
}

function Escrow() {
  const [params] = useSearchParams()
  const [escrow, setEscrow] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(params.get('funded') ? 'Escrow deposit recorded.' : '')

  useEffect(() => {
    fetchEscrowAccounts().then(({ escrow: rows }) => setEscrow(rows))
  }, [])

  async function handleFund(account, milestoneAmount) {
    const amount = milestoneAmount ?? account.amount - account.funded
    if (amount <= 0) return
    setLoading(account.id)
    setMessage('')
    const result = await fundEscrow({ escrowId: account.id, amount, provider })
    if (result.checkout_url) return
    setMessage(result.message || 'Escrow deposit initiated.')
    setLoading(null)
  }

  return (
    <FinanceShell titleKey="hubs.finance.escrow.title" subtitleKey="hubs.finance.escrow.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
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
            <article key={e.id} className="panel-card bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{e.property}</h2>
                  <p className="text-sm text-ink-secondary">Buyer: {e.buyer}</p>
                  {e.transactionId && (
                    <Link to="/transactions" className="text-sm font-semibold text-brand-accent underline">
                      Transaction {e.transactionId} →
                    </Link>
                  )}
                </div>
                <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold capitalize text-ink">{e.status}</span>
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

              {e.milestones?.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-surface-border pt-4">
                  {e.milestones.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-ink-secondary">Due {m.due}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">GHS {m.amount.toLocaleString()}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${milestoneStyles[m.status] || milestoneStyles.scheduled}`}>
                          {m.status}
                        </span>
                        {m.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleFund(e, m.amount)}
                            disabled={loading === e.id}
                            className="rounded-lg bg-brand-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Fund
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {remaining > 0 && !e.milestones?.length && (
                <button
                  type="button"
                  onClick={() => handleFund(e)}
                  disabled={loading === e.id}
                  className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
