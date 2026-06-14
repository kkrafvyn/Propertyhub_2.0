import { supabase } from '../lib/supabase'
import {
  createPriceAlertInDb,
  deletePriceAlertInDb,
  fetchPriceAlertsFromDb,
} from '../lib/supabase-db'

function localKey(userId) {
  return `baytmiftah_price_alerts_${userId || 'guest'}`
}

export async function fetchPriceAlerts() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchPriceAlertsFromDb(user.id)
      if (rows) return { alerts: rows, source: 'supabase' }
    }
  }
  try {
    return { alerts: JSON.parse(localStorage.getItem(localKey()) || '[]'), source: 'local' }
  } catch {
    return { alerts: [], source: 'local' }
  }
}

export async function setPriceAlert({ listingId, targetPrice }) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const row = await createPriceAlertInDb({
        userId: user.id,
        listingId,
        targetPrice: targetPrice ? Number(targetPrice) : null,
      })
      if (row) return { ok: true, alert: row, source: 'supabase' }
    }
  }

  const alert = {
    id: `local-${Date.now()}`,
    listing_id: listingId,
    target_price: targetPrice ? Number(targetPrice) : null,
    notify_on_drop: true,
  }
  try {
    const stored = JSON.parse(localStorage.getItem(localKey()) || '[]')
    const filtered = stored.filter((a) => a.listing_id !== listingId)
    localStorage.setItem(localKey(), JSON.stringify([alert, ...filtered]))
  } catch { /* ignore */ }
  return { ok: true, alert, source: 'local' }
}

export async function removePriceAlert(listingId) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await deletePriceAlertInDb(user.id, listingId)) {
      return { ok: true, source: 'supabase' }
    }
  }
  try {
    const stored = JSON.parse(localStorage.getItem(localKey()) || '[]')
    localStorage.setItem(localKey(), JSON.stringify(stored.filter((a) => a.listing_id !== listingId)))
  } catch { /* ignore */ }
  return { ok: true, source: 'local' }
}

export default { fetchPriceAlerts, setPriceAlert, removePriceAlert }
