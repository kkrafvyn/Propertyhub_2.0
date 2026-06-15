import { fetchSavedIdsFromDb, mergeSavedListingsToDb, toggleSavedInDb } from './supabase-db'
import { supabase } from './supabase'

const STORAGE_KEY = 'baytmiftah_saved'

export function getSavedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setSavedIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function toggleSavedId(id) {
  const ids = getSavedIds()
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
  setSavedIds(next)
  return next
}

export function isSaved(id) {
  return getSavedIds().includes(id)
}

async function getAuthUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function syncSavedIds() {
  const userId = await getAuthUserId()
  if (!userId) return getSavedIds()

  const ids = await fetchSavedIdsFromDb(userId)
  if (ids) {
    setSavedIds(ids)
    return ids
  }
  return getSavedIds()
}

export async function toggleSavedIdAsync(id) {
  const userId = await getAuthUserId()
  if (userId) {
    const saved = await toggleSavedInDb(userId, id)
    if (saved !== null) {
      const current = getSavedIds()
      const next = saved
        ? [...new Set([...current, id])]
        : current.filter((x) => x !== id)
      setSavedIds(next)
      return next
    }
  }
  return toggleSavedId(id)
}

/** Union local + remote saved IDs on login and persist to Supabase */
export async function mergeSavedOnLogin() {
  const userId = await getAuthUserId()
  if (!userId) return getSavedIds()

  const localIds = getSavedIds()
  const merged = await mergeSavedListingsToDb(userId, localIds)
  if (merged) {
    setSavedIds(merged)
    return merged
  }

  const remoteIds = await fetchSavedIdsFromDb(userId)
  if (remoteIds) {
    const union = [...new Set([...remoteIds, ...localIds])]
    setSavedIds(union)
    return union
  }
  return localIds
}
