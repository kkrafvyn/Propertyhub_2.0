import { callEdgeFunction } from '../lib/edge-client'

export async function fetchRentalApplications() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'applications' },
    })
    if (payload?.applications) return payload
  } catch { /* fallback */ }
  return { applications: [], source: 'local' }
}

export async function submitRentalApplication({ listingId, property, moveInDate, income, occupants, notes }) {
  return callEdgeFunction('renter', {
    method: 'POST',
    allowAnonymous: false,
    body: {
      action: 'submit_application',
      listing_id: listingId,
      property,
      move_in_date: moveInDate,
      income,
      occupants,
      notes,
    },
  })
}

export async function fetchIncomingRentalApplications() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'incoming_applications' },
    })
    if (payload?.applications) return payload
  } catch { /* fallback */ }
  return { applications: [], source: 'local' }
}

export async function reviewRentalApplication(applicationId, decision) {
  return callEdgeFunction('renter', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'review_application', application_id: applicationId, decision },
  })
}

export default { fetchRentalApplications, fetchIncomingRentalApplications, submitRentalApplication, reviewRentalApplication }
