import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'

const KEY = 'baytmiftah_compare'
const MAX = 4

export function getCompareIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function setCompareIds(ids) {
  localStorage.setItem(KEY, JSON.stringify(ids))
}

export async function syncCompareIds() {
  if (!supabase) return getCompareIds()
  try {
    const payload = await callEdgeFunction('persistence', {
      allowAnonymous: false,
      query: { action: 'compare' },
    })
    if (payload?.ids) {
      setCompareIds(payload.ids)
      return payload.ids
    }
  } catch { /* local fallback */ }
  return getCompareIds()
}

export function toggleCompareId(id) {
  const ids = getCompareIds()
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  if (ids.length >= MAX) return ids
  const next = [...ids, id]
  setCompareIds(next)
  return next
}

export async function toggleCompareIdAsync(id) {
  if (supabase) {
    try {
      const payload = await callEdgeFunction('persistence', {
        method: 'POST',
        allowAnonymous: false,
        body: { action: 'toggle_compare', listing_id: id },
      })
      if (payload?.ok !== undefined) {
        const current = getCompareIds()
        const next = payload.saved
          ? [...new Set([...current, id])]
          : current.filter((x) => x !== id)
        setCompareIds(next)
        return next
      }
    } catch { /* fallback */ }
  }
  return toggleCompareId(id)
}

export function clearCompare() {
  localStorage.removeItem(KEY)
}
