import { callEdgeFunction } from '../lib/edge-client'
import {
  demoVisitorPasses,
  demoAnnouncements,
  demoResidentAccess,
} from '../data/os-platform'

export async function fetchTenantVisitors() {
  try {
    const payload = await callEdgeFunction('resident', { allowAnonymous: false, query: { action: 'visitors' } })
    if (payload?.passes) return payload
  } catch { /* fallback */ }
  return { passes: demoVisitorPasses, source: 'local' }
}

export async function createVisitorPass({ guestName, validFrom, validTo, propertyId }) {
  try {
    return await callEdgeFunction('resident', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'create_visitor_pass',
        guest_name: guestName,
        valid_from: validFrom,
        valid_to: validTo,
        property_id: propertyId,
      },
    })
  } catch (error) {
    return { ok: false, error: error.message, demo: true }
  }
}

export async function fetchTenantAnnouncements() {
  try {
    const payload = await callEdgeFunction('resident', { allowAnonymous: false, query: { action: 'announcements' } })
    if (payload?.announcements) return payload
  } catch { /* fallback */ }
  return { announcements: demoAnnouncements, source: 'local' }
}

export async function fetchResidentDashboard() {
  try {
    const payload = await callEdgeFunction('resident', { allowAnonymous: false, query: { action: 'dashboard' } })
    if (payload?.access) return payload
  } catch { /* fallback */ }
  return { access: demoResidentAccess, source: 'local' }
}

export async function unlockDoor(deviceId) {
  try {
    return await callEdgeFunction('resident', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'unlock', device_id: deviceId },
    })
  } catch (error) {
    return { ok: true, demo: true, device_id: deviceId }
  }
}

export async function fetchResidentEnergy() {
  try {
    const payload = await callEdgeFunction('resident', { allowAnonymous: false, query: { action: 'energy' } })
    if (payload?.readings) return payload
  } catch { /* fallback */ }
  return {
    readings: [{ period: '2026-06', kwh: demoResidentAccess.energyKwh, cost: demoResidentAccess.energyCost }],
    source: 'local',
  }
}
