import { monetizationService } from './mvp-service'
import { callEdgeFunction } from './edge-client'

export async function getFeaturedListingUpsells(organizationId) {
  try {
    const [plans, campaigns] = await Promise.all([
      monetizationService.getPlans('agency').catch(() => []),
      organizationId
        ? monetizationService.listFeaturedCampaigns(organizationId).catch(() => [])
        : Promise.resolve([]),
    ])
    return { plans, campaigns, source: 'supabase' }
  } catch {
    return {
      source: 'local',
      campaigns: [],
      plans: [
        {
          id: 'featured-boost',
          name: 'Featured Boost',
          price: 350,
          currency: 'GHS',
          features: ['Top search placement', 'Homepage surfacing', 'Lead priority badge'],
        },
      ],
    }
  }
}

export async function createBoostCheckout({
  provider = 'stripe',
  listing,
  plan,
  customerEmail,
}) {
  const amount = Number(plan?.price || plan?.price_monthly || 350)

  return callEdgeFunction('payments', {
    method: 'POST',
    query: { action: 'create-checkout' },
    body: {
      provider,
      listingId: listing?.id,
      organizationId: listing?.organization?.id,
      customerEmail,
      priceId: plan?.stripePriceId || plan?.stripe_price_id,
      amount,
      price: amount,
      currency: plan?.currency || 'GHS',
      placement: 'featured_boost',
    },
  })
}
