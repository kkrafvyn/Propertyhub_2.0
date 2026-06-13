import { useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { initiateCheckout } from '../../services/payments-service'
import { rentCollectionRails } from '../../data/finance'
import { getDefaultProvider } from '../../lib/payment-providers'

function RentCollection() {
  const [provider, setProvider] = useState(getDefaultProvider())
  const [amount, setAmount] = useState('125000')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleCollect() {
    setLoading(true)
    setMessage('')
    const result = await initiateCheckout({
      purpose: 'rent_collection',
      amount: Number(amount),
      provider,
      metadata: { type: 'landlord_collection' },
      successPath: '/finance/rent-collection?success=1',
      cancelPath: '/finance/rent-collection',
    })
    if (!result.checkout_url) {
      setMessage(result.message || 'Collection initiated.')
    }
    setLoading(false)
  }

  return (
    <FinanceShell title="Rent collection rails" subtitle="Collect rent via Paystack (Africa) or Stripe (international)">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold">Collect payment</h3>
          <p className="mt-1 text-sm text-ink-secondary">Landlords and property managers can send payment links to tenants.</p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Amount (GHS)
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border px-4 py-2 text-sm"
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Provider</p>
              <PaymentProviderPicker value={provider} onChange={setProvider} disabled={loading} />
            </div>
            <button
              type="button"
              onClick={handleCollect}
              disabled={loading}
              className="rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand disabled:opacity-60"
            >
              {loading ? 'Creating checkout…' : 'Create payment link'}
            </button>
            {message && <p className="text-sm text-brand-dark">{message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(rentCollectionRails).map(([key, rail]) => (
            <article key={key} className="rounded-card border border-surface-border bg-surface p-4">
              <h4 className="font-semibold">{rail.label}</h4>
              <p className="text-sm text-ink-secondary">{rail.region} · {rail.currency}</p>
              <p className="mt-2 text-sm">{rail.methods.join(' · ')}</p>
            </article>
          ))}
        </div>
      </div>
    </FinanceShell>
  )
}

export default function RentCollectionPage() {
  return <ProtectedRoute><RentCollection /></ProtectedRoute>
}
