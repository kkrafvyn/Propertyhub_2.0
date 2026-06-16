import { callEdgeFunction } from '../lib/edge-client'
import {
  mortgageProducts,
  escrowAccounts,
  insuranceProducts,
  commissionSettlements,
} from '../data/finance'

export async function fetchFinanceDashboard() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: false,
      query: { action: 'finance_dashboard' },
    })
    if (payload?.summary) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return {
    summary: {
      escrowTotal: escrowAccounts.reduce((s, e) => s + e.funded, 0),
      pendingCommissions: commissionSettlements.filter((c) => c.status !== 'paid').length,
      mortgagePartners: mortgageProducts.length,
    },
    source: 'local',
  }
}

export async function fetchMortgages() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: false,
      query: { action: 'mortgage_partners' },
    })
    if (payload?.partners?.length) {
      return {
        mortgages: payload.partners.map((p) => ({
          id: p.id,
          lender: p.name,
          rate: p.rate,
          maxLtv: p.max_ltv,
          regions: p.regions,
        })),
        source: 'supabase',
      }
    }
  } catch { /* fallback */ }
  return { mortgages: mortgageProducts, source: 'local' }
}

export async function fetchEscrowAccounts({ role = 'buyer' } = {}) {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: false,
      query: { action: 'escrow', role },
    })
    if (payload?.escrow?.length) return { escrow: payload.escrow, source: 'supabase' }
    if (payload?.escrow) return { escrow: payload.escrow, source: 'supabase' }
  } catch { /* fallback */ }
  return { escrow: escrowAccounts, source: 'local' }
}

export async function releaseEscrow(escrowId) {
  return callEdgeFunction('payments', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'release_escrow', escrow_id: escrowId },
  })
}

export async function disputeEscrow(escrowId, reason) {
  return callEdgeFunction('payments', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'dispute_escrow', escrow_id: escrowId, reason },
  })
}

export async function applyMortgageReferral({ partnerId, listingId, amount, metadata }) {
  return callEdgeFunction('payments', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'mortgage_referral', partner_id: partnerId, listing_id: listingId, amount, metadata },
  })
}

export async function fetchInsuranceProducts() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: true,
      query: { action: 'insurance' },
    })
    if (payload?.products?.length) return { products: payload.products, source: 'supabase' }
  } catch { /* fallback */ }
  return { products: insuranceProducts, source: 'local' }
}

export async function fetchCommissionSettlements() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: false,
      query: { action: 'commissions' },
    })
    if (payload?.settlements?.length) return { settlements: payload.settlements, source: 'supabase' }
  } catch { /* fallback */ }
  return { settlements: commissionSettlements, source: 'local' }
}

export default {
  fetchFinanceDashboard,
  fetchMortgages,
  fetchEscrowAccounts,
  fetchInsuranceProducts,
  fetchCommissionSettlements,
}
