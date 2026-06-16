import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import { fetchSubscriptionPlans, subscribeToPlan } from '../../services/billing-service'

function Billing() {
  const [params] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState(params.get('subscribed') ? 'Subscription activated.' : '')

  useEffect(() => {
    fetchSubscriptionPlans().then(({ plans: rows }) => setPlans(rows ?? []))
  }, [])

  async function handleSubscribe(planId) {
    setLoading(planId)
    const result = await subscribeToPlan(planId)
    if (result?.checkout_url) return
    setMessage(result?.message || 'Subscription initiated.')
    setLoading(null)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Platform billing</h1>
      <p className="mt-1 text-ink-secondary">Agent, agency, and enterprise SaaS plans</p>
      {message && <p className="mt-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm">{message}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <PanelCard key={p.id} title={p.name}>
            <p className="text-2xl font-bold">{p.currency} {Number(p.price_monthly).toLocaleString()}<span className="text-sm font-normal text-ink-secondary">/mo</span></p>
            <p className="mt-1 text-xs capitalize text-ink-secondary">{p.tier} tier</p>
            <PrimaryButton className="mt-4" disabled={loading === p.id} onClick={() => handleSubscribe(p.id)}>
              {loading === p.id ? 'Redirecting…' : 'Subscribe'}
            </PrimaryButton>
          </PanelCard>
        ))}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return <ProtectedRoute><Billing /></ProtectedRoute>
}
