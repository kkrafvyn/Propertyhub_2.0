import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import { createFeaturedBoost } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function FeaturedBoost() {
  const [params] = useSearchParams()
  const listingId = params.get('listing') || ''
  const [provider, setProvider] = useState(getDefaultProvider())
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleBoost(amount, plan) {
    setLoading(true)
    setStatus('')
    const result = await createFeaturedBoost({
      listingId: listingId || 'demo-listing',
      provider,
      amount,
      plan,
    })
    if (!result.checkout_url) {
      setStatus(result.message || 'Boost request submitted.')
    }
    setLoading(false)
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Feature your listing</h1>
      <p className="mt-1 text-ink-secondary">Get premium placement — pay with Paystack (Africa) or Stripe (international).</p>

      <div className="mt-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Payment provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={loading} />
      </div>

      <div className="mt-8 grid max-w-2xl gap-4">
        <Plan
          name="Featured boost"
          price="GHS 299 / 14 days"
          perks={['Top of search results', 'Featured badge', 'Neighborhood spotlight']}
          onSelect={() => handleBoost(299, 'featured_14d')}
          loading={loading}
        />
        <Plan
          name="Sponsored placement"
          price="GHS 599 / 30 days"
          perks={['Homepage carousel', 'AI search priority', 'Analytics dashboard']}
          onSelect={() => handleBoost(599, 'sponsored_30d')}
          loading={loading}
        />
      </div>

      {status && (
        <p className="mt-6 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{status}</p>
      )}
    </DesktopShell>
  )
}

function Plan({ name, price, perks, onSelect, loading }) {
  return (
    <article className="panel-card bg-surface p-6">
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="mt-1 text-2xl font-bold text-ink">{price}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
        {perks.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {p}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onSelect} disabled={loading} className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {loading ? 'Redirecting to checkout…' : 'Get started'}
      </button>
    </article>
  )
}

export default function FeaturedBoostPage() {
  return <ProtectedRoute><FeaturedBoost /></ProtectedRoute>
}
