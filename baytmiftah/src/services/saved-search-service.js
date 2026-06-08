import { callEdgeFunction } from './edge-client'

const SAVED_SEARCH_KEY = 'baytmiftah_saved_searches'

const syncSavedSearch = (search) =>
  callEdgeFunction('persistence', {
    method: 'POST',
    query: { action: 'save', type: 'saved_search' },
    body: search,
  })

export function getSavedSearches() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_SEARCH_KEY) || '[]')
  } catch {
    return []
  }
}

export async function saveSearchAlert(payload) {
  const search = {
    id: `search-${Date.now()}`,
    alertFrequency: 'instant',
    created_at: new Date().toISOString(),
    ...payload,
  }
  const next = [search, ...getSavedSearches()].slice(0, 20)
  localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(next))

  try {
    const remote = await syncSavedSearch(search)
    return { search: { ...search, ...remote }, source: 'supabase' }
  } catch (error) {
    return { search, source: 'local', error: error.message }
  }
}

export async function listRemoteSavedSearches() {
  try {
    const searches = await callEdgeFunction('persistence', {
      query: { action: 'list', type: 'saved_search' },
    })
    return { searches, source: 'supabase' }
  } catch (error) {
    return { searches: getSavedSearches(), source: 'local', error: error.message }
  }
}

export function removeSearchAlert(id) {
  const next = getSavedSearches().filter((item) => item.id !== id)
  localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(next))
  return next
}
