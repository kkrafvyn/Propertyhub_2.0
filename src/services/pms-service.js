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
    if (payload?.collection?.length) return { collection: payload.collection, expenses: payload.expenses, source: 'supabase' }
  } catch { /* fallback */ }
  return { collection: rentCollection, expenses, source: 'local' }
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
  fetchInspections,
}
