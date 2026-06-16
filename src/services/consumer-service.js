import { callEdgeFunction } from '../lib/edge-client'

export async function fetchConsumerActivity() {
  try {
    const payload = await callEdgeFunction('consumer', {
      allowAnonymous: false,
      query: { action: 'activity' },
    })
    if (payload?.activity) return { activity: payload.activity, source: 'supabase' }
  } catch { /* fallback */ }
  return { activity: [], source: 'local' }
}

export async function fetchConsumerHomeStats() {
  try {
    const payload = await callEdgeFunction('consumer', {
      allowAnonymous: false,
      query: { action: 'home_stats' },
    })
    if (payload?.stats) return { stats: payload.stats, source: 'supabase' }
  } catch { /* fallback */ }
  return { stats: null, source: 'local' }
}

export default { fetchConsumerActivity, fetchConsumerHomeStats }
