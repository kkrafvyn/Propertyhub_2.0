import { callEdgeFunction } from '../lib/edge-client'
import {
  pmsPortfolio,
  tenants,
  workOrders,
  vendors,
  rentCollection,
  expenses,
  inspections,
} from '../data/pms'

export async function fetchPmsDashboard() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.portfolio) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return {
    portfolio: pmsPortfolio,
    tenants,
    workOrders,
    source: 'local',
  }
}

export async function fetchTenants() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'tenants' },
    })
    if (payload?.tenants?.length) return { tenants: payload.tenants, source: 'supabase' }
  } catch { /* fallback */ }
  return { tenants, source: 'local' }
}

export async function fetchWorkOrders() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'work_orders' },
    })
    if (payload?.workOrders?.length) return { workOrders: payload.workOrders, vendors: payload.vendors, source: 'supabase' }
  } catch { /* fallback */ }
  return { workOrders, vendors, source: 'local' }
}

export async function fetchRentCollection() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'rent_collection' },
    })
    if (payload?.collection) return payload
  } catch { /* fallback */ }
  return { collection: rentCollection, expenses, utilityArrears: 760, utilityBills: [], source: 'local' }
}

export async function fetchLandlordArrears() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'arrears' },
    })
    if (payload?.arrears) return payload
  } catch { /* fallback */ }
  const rentItems = rentCollection.filter((c) => c.status !== 'paid').map((c) => ({
    id: c.id,
    type: 'rent',
    tenant: c.tenant,
    unit: c.unit,
    amount: c.amount,
    status: c.status,
  }))
  return {
    summary: { rentArrears: 125000, utilityArrears: 760, totalArrears: 125760 },
    arrears: rentItems,
    source: 'local',
  }
}

export async function fetchInspections() {
  try {
    const payload = await callEdgeFunction('pms', {
      allowAnonymous: false,
      query: { action: 'inspections' },
    })
    if (payload?.inspections?.length) return { inspections: payload.inspections, source: 'supabase' }
  } catch { /* fallback */ }
  return { inspections, source: 'local' }
}

export default {
  fetchPmsDashboard,
  fetchTenants,
  fetchWorkOrders,
  fetchRentCollection,
  fetchLandlordArrears,
  fetchInspections,
}
