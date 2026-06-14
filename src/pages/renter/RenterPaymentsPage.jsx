import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { fetchRentPayments } from '../../services/renter-service'
import { payRent } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Payments() {
  const [params] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(params.get('paid') ? 'Payment recorded — thank you!' : '')

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => setPayments(rows))
  }, [])

  async function handlePay(p) {
    setLoading(p.id)
    setMessage('')
    const result = await payRent({
      paymentId: p.id,
      amount: p.amount,
      provider,
      metadata: { period: p.period },
    })
    if (!result.checkout_url) {
      setMessage(result.message || 'Payment initiated.')
    }
    setLoading(null)
  }

  return (
    <RenterShell titleKey="hubs.renter.payments.title" subtitleKey="hubs.renter.payments.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Payment provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{p.period}</p>
              <p className="text-sm text-ink-secondary">Due {p.due}{p.method ? ` · ${p.method}` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-bold text-ink">GHS {p.amount.toLocaleString()}</p>
              {p.status === 'due' ? (
                <button
                  type="button"
                  onClick={() => handlePay(p)}
                  disabled={loading === p.id}
                  className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading === p.id ? 'Redirecting…' : 'Pay now'}
                </button>
              ) : (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Paid</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </RenterShell>
  )
}

export default function RenterPaymentsPage() {
  return <ProtectedRoute><Payments /></ProtectedRoute>
}
