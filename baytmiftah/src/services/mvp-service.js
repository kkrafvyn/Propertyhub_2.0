import callEdgeFunction from './edge-client'

export const complianceService = {
  getGhanaBaseline: () =>
    callEdgeFunction('compliance', {
      query: { action: 'ghana-baseline' },
      allowAnonymous: true,
    }),
  reviewListing: (payload) =>
    callEdgeFunction('compliance', {
      method: 'POST',
      query: { action: 'review-listing' },
      body: payload,
    }),
  getListingReview: (listingId) =>
    callEdgeFunction('compliance', {
      query: { action: 'listing-review', listingId },
    }),
}

export const trustService = {
  calculateScore: (payload) =>
    callEdgeFunction('trust', {
      method: 'POST',
      query: { action: 'score' },
      body: payload,
    }),
  createSignal: (payload) =>
    callEdgeFunction('trust', {
      method: 'POST',
      query: { action: 'signal' },
      body: payload,
    }),
  listSignals: (organizationId) =>
    callEdgeFunction('trust', {
      query: { action: 'signals', organizationId },
    }),
}

export const agencyCrmService = {
  getPipeline: (organizationId) =>
    callEdgeFunction('agency-crm', {
      query: { action: 'pipeline', organizationId },
    }),
  getActivities: ({ organizationId, leadId } = {}) =>
    callEdgeFunction('agency-crm', {
      query: { action: 'activities', organizationId, leadId },
    }),
  recordActivity: (payload) =>
    callEdgeFunction('agency-crm', {
      method: 'POST',
      query: { action: 'record-activity' },
      body: payload,
    }),
  scoreLeadIntent: (payload) =>
    callEdgeFunction('agency-crm', {
      method: 'POST',
      query: { action: 'lead-intent' },
      body: payload,
    }),
  updateLead: (payload) =>
    callEdgeFunction('agency-crm', {
      method: 'PUT',
      query: { action: 'update-lead', leadId: payload.leadId },
      body: payload,
    }),
}

export const monetizationService = {
  getPlans: (audience = 'agency') =>
    callEdgeFunction('monetization', {
      query: { action: 'plans', audience },
      allowAnonymous: true,
    }),
  getSubscription: (organizationId) =>
    callEdgeFunction('monetization', {
      query: { action: 'subscription', organizationId },
    }),
  listFeaturedCampaigns: (organizationId) =>
    callEdgeFunction('monetization', {
      query: { action: 'featured-campaigns', organizationId },
    }),
  createFeaturedCampaign: (payload) =>
    callEdgeFunction('monetization', {
      method: 'POST',
      query: { action: 'create-featured-campaign' },
      body: payload,
    }),
}

export default {
  complianceService,
  trustService,
  agencyCrmService,
  monetizationService,
}
