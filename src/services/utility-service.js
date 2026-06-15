import { callEdgeFunction } from '../lib/edge-client'
import { getDefaultCountry } from '../lib/market-context'
import {
  demoProviders,
  demoPropertyUtilities,
  demoUtilityAccount,
  demoUtilityBills,
  demoMeterReadings,
} from '../data/utilities'

function mapBill(row) {
  return {
    id: row.id,
    accountId: row.utility_account_id,
    type: row.utility_type,
    providerName: row.provider_name,
    amount: Number(row.amount),
    usageUnits: row.usage_units != null ? Number(row.usage_units) : null,
    month: row.billing_month,
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
  }
}

export async function fetchUtilityProviders(country) {
  const resolvedCountry = country ?? getDefaultCountry()
  try {
    const payload = await callEdgeFunction('utilities', {
      query: { action: 'providers', country: resolvedCountry },
      allowAnonymous: true,
    })
    if (payload?.providers) return payload
  } catch { /* fallback */ }
  return { providers: demoProviders, source: 'local' }
}

export async function fetchPropertyUtilities(propertyId) {
  try {
    const payload = await callEdgeFunction('utilities', {
      query: { action: 'property_config', property_id: propertyId },
      allowAnonymous: true,
    })
    if (payload?.utilities) return payload
  } catch { /* fallback */ }
  const utilities = demoPropertyUtilities.filter((u) => u.property_id === propertyId)
  return { utilities: utilities.length ? utilities : demoPropertyUtilities, source: 'local' }
}

export async function fetchUtilityDashboard() {
  try {
    const payload = await callEdgeFunction('utilities', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.bills) {
      return {
        accounts: payload.accounts ?? [],
        bills: (payload.bills ?? []).map(mapBill),
        summary: payload.summary ?? { totalDue: 0, unpaidCount: 0 },
        source: payload.source ?? 'supabase',
      }
    }
  } catch { /* fallback */ }

  const bills = demoUtilityBills.map(mapBill)
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  return {
    accounts: [demoUtilityAccount],
    bills,
    summary: {
      totalDue: unpaid.reduce((s, b) => s + b.amount, 0),
      unpaidCount: unpaid.length,
    },
    source: 'local',
  }
}

export async function fetchUtilityBills(accountId) {
  try {
    const query = { action: 'bills' }
    if (accountId) query.account_id = accountId
    const payload = await callEdgeFunction('utilities', { allowAnonymous: false, query })
    if (payload?.bills) return { bills: payload.bills.map(mapBill), source: payload.source }
  } catch { /* fallback */ }
  const bills = demoUtilityBills.map(mapBill)
  return { bills: accountId ? bills.filter((b) => b.accountId === accountId) : bills, source: 'local' }
}

export async function fetchMeterReadings(accountId) {
  try {
    const payload = await callEdgeFunction('utilities', {
      allowAnonymous: false,
      query: { action: 'readings', account_id: accountId },
    })
    if (payload?.readings) return payload
  } catch { /* fallback */ }
  return {
    readings: demoMeterReadings.filter((r) => r.utility_account_id === accountId),
    source: 'local',
  }
}

export async function recordMeterReading(body) {
  return callEdgeFunction('utilities', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'record_reading', ...body },
  })
}

export async function generateMonthlyBills(month) {
  return callEdgeFunction('utilities', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'generate_bills', month },
  })
}

export async function savePropertyUtilityConfig(body) {
  return callEdgeFunction('utilities', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'save_property_config', ...body },
  })
}

export async function markUtilityBillPaid(billId, paymentId) {
  return callEdgeFunction('utilities', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'mark_paid', bill_id: billId, payment_id: paymentId },
  })
}

export async function getPayAllSummary() {
  try {
    return await callEdgeFunction('utilities', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'pay_all' },
    })
  } catch {
    const unpaid = demoUtilityBills.filter((b) => b.status === 'unpaid')
    return {
      ok: true,
      bill_ids: unpaid.map((b) => b.id),
      total: unpaid.reduce((s, b) => s + Number(b.amount), 0),
      currency: 'GHS',
      source: 'local',
    }
  }
}

export async function fetchPrepaidBalances(accountId) {
  try {
    const payload = await callEdgeFunction('utilities', {
      allowAnonymous: false,
      query: { action: 'prepaid_balances', account_id: accountId },
    })
    if (payload?.balances) return payload
  } catch { /* fallback */ }
  return { balances: [], source: 'local' }
}

export async function topUpPrepaid({ accountId, utilityType, units, amount }) {
  return callEdgeFunction('utilities', {
    method: 'POST',
    allowAnonymous: false,
    body: {
      action: 'prepaid_topup',
      utility_account_id: accountId,
      utility_type: utilityType ?? 'electricity',
      units,
      amount,
    },
  })
}

export default {
  fetchUtilityProviders,
  fetchPropertyUtilities,
  fetchUtilityDashboard,
  fetchUtilityBills,
  fetchMeterReadings,
  recordMeterReading,
  generateMonthlyBills,
  savePropertyUtilityConfig,
  markUtilityBillPaid,
  getPayAllSummary,
  fetchPrepaidBalances,
  topUpPrepaid,
}
