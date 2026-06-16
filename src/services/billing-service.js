import { callEdgeFunction } from '../lib/edge-client'

export async function fetchSubscriptionPlans() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: true,
      query: { action: 'subscription_plans' },
    })
    if (payload?.plans) return payload
  } catch { /* fallback */ }
  return {
    plans: [
      { id: 'plan-agent-starter', name: 'Agent Starter', tier: 'agent', price_monthly: 199, currency: 'GHS' },
      { id: 'plan-agency-pro', name: 'Agency Pro', tier: 'agency', price_monthly: 899, currency: 'GHS' },
      { id: 'plan-enterprise', name: 'Enterprise', tier: 'enterprise', price_monthly: 4999, currency: 'GHS' },
    ],
    source: 'local',
  }
}

export async function subscribeToPlan(planId, provider = 'paystack') {
  return callEdgeFunction('payments', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'subscribe', plan_id: planId, provider },
  })
}

export async function submitMortgageReferral({ partnerId, listingId, amount, metadata }) {
  return callEdgeFunction('payments', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'mortgage_referral', partner_id: partnerId, listing_id: listingId, amount, metadata },
  })
}

export default { fetchSubscriptionPlans, subscribeToPlan, submitMortgageReferral }
