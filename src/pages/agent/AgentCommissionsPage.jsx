import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchCommissions } from '../../services/agent-service'
import { settleCommission } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Commissions() {
  const { t } = useTranslation()
  const [commissions, setCommissions] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchCommissions().then(({ commissions: rows }) =>
      setCommissions(rows.map((c) => ({ ...c, settlementId: c.settlementId ?? c.id }))),
    )
  }, [])

  const total = commissions.reduce((sum, c) => sum + c.amount, 0)
  const payable = commissions.filter((c) => c.status === 'pending' && c.settlementId)

  async function handlePayout(commission) {
    if (!commission.settlementId) return
    setLoading(commission.id)
    setMessage('')
    const result = await settleCommission({
      settlementId: commission.settlementId,
      amount: commission.amount,
      provider,
    })
    if (!result.checkout_url) {
      setMessage(result.message || 'Payout initiated.')
      setCommissions((prev) =>
        prev.map((c) => (c.id === commission.id ? { ...c, status: 'processing' } : c)),
      )
    }
    setLoading(null)
  }

  return (
    <AgentShell titleKey="hubs.agent.commissions.title" subtitleKey="hubs.agent.commissions.subtitle">
      <p className="mb-2 text-2xl font-bold text-ink">GHS {total.toLocaleString()}</p>
      {payable.length > 0 && (
        <p className="mb-4 text-sm text-ink-secondary">
          {payable.length} commission{payable.length > 1 ? 's' : ''} linked to real payment settlements
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Payout provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
      </div>

      <div className="space-y-3">
        {commissions.map((c) => (
          <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{c.property}</p>
              <p className="text-sm text-ink-secondary">
                Closed: {c.closed}
                {c.settlementId && ` · Settlement ${c.settlementId}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-ink">GHS {c.amount.toLocaleString()}</p>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{c.status}</span>
              {c.status === 'pending' && c.settlementId && (
                <button
                  type="button"
                  onClick={() => handlePayout(c)}
                  disabled={loading === c.id}
                  className="mt-2 block w-full rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {loading === c.id ? t('mobile.redirecting') : 'Request payout'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentCommissionsPage() {
  return <ProtectedRoute><Commissions /></ProtectedRoute>
}
