import { callEdgeFunction } from '../lib/edge-client'

export async function fetchVendorDashboard() {
  try {
    const payload = await callEdgeFunction('vendors', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload) return payload
  } catch { /* fallback */ }
  return { vendors: [], assignedJobs: [], vendorProfile: null, source: 'local' }
}

export async function fetchVendorDirectory() {
  try {
    const payload = await callEdgeFunction('vendors', {
      allowAnonymous: false,
      query: { action: 'directory' },
    })
    if (payload?.vendors) return payload
  } catch { /* fallback */ }
  return { vendors: [], source: 'local' }
}

export async function fetchVendorJobs() {
  try {
    const payload = await callEdgeFunction('vendors', {
      allowAnonymous: false,
      query: { action: 'jobs' },
    })
    if (payload?.jobs) return payload
  } catch { /* fallback */ }
  return { jobs: [], source: 'local' }
}

export async function fetchOpenWorkOrders() {
  try {
    const payload = await callEdgeFunction('vendors', {
      allowAnonymous: false,
      query: { action: 'open_jobs' },
    })
    if (payload) return payload
  } catch { /* fallback */ }
  return { workOrders: [], vendors: [], source: 'local' }
}

export async function saveVendor(vendor) {
  return callEdgeFunction('vendors', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'save_vendor', ...vendor },
  })
}

export async function assignVendorToJob(workOrderId, vendorId) {
  return callEdgeFunction('vendors', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'assign_job', work_order_id: workOrderId, vendor_id: vendorId },
  })
}

export async function updateVendorJobStatus(workOrderId, status) {
  return callEdgeFunction('vendors', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_job_status', work_order_id: workOrderId, status },
  })
}

export default {
  fetchVendorDashboard,
  fetchVendorDirectory,
  fetchVendorJobs,
  fetchOpenWorkOrders,
  saveVendor,
  assignVendorToJob,
  updateVendorJobStatus,
}
