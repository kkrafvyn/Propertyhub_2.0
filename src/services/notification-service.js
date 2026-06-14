import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import {
  createNotificationInDb,
  fetchNotificationsFromDb,
  markNotificationReadInDb,
} from '../lib/supabase-db'

export async function fetchNotifications() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchNotificationsFromDb(user.id)
      if (rows) return { notifications: rows, source: 'supabase' }
    }
  }
  try {
    const stored = JSON.parse(localStorage.getItem('baytmiftah_notifications') || '[]')
    return { notifications: stored, source: 'local' }
  } catch {
    return { notifications: [], source: 'local' }
  }
}

export async function markNotificationRead(id) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await markNotificationReadInDb(user.id, id)) {
      return { ok: true, source: 'supabase' }
    }
  }
  try {
    const stored = JSON.parse(localStorage.getItem('baytmiftah_notifications') || '[]')
    const next = stored.map((n) => (n.id === id ? { ...n, read: true } : n))
    localStorage.setItem('baytmiftah_notifications', JSON.stringify(next))
  } catch { /* ignore */ }
  return { ok: true, source: 'local' }
}

export async function notifyUser({ userId, type, title, body, link }) {
  if (supabase && userId) {
    const row = await createNotificationInDb({ userId, type, title, body, link })
    if (row) return { ok: true, notification: row, source: 'supabase' }
  }
  const note = {
    id: `local-${Date.now()}`,
    type,
    title,
    body,
    link,
    read: false,
    created_at: new Date().toISOString(),
  }
  try {
    const stored = JSON.parse(localStorage.getItem('baytmiftah_notifications') || '[]')
    localStorage.setItem('baytmiftah_notifications', JSON.stringify([note, ...stored]))
  } catch { /* ignore */ }
  return { ok: true, notification: note, source: 'local' }
}

export async function notifyCurrentUser(payload) {
  if (!supabase) return notifyUser({ ...payload, userId: null })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  return notifyUser({ ...payload, userId: user.id })
}

export default { fetchNotifications, markNotificationRead, notifyUser, notifyCurrentUser }
