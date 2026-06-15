import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { mergeCapabilities, getDefaultCapabilitiesForRole } from '../lib/capabilities'

export async function fetchUserCapabilities(userId, role) {
  const defaults = getDefaultCapabilitiesForRole(role)

  if (!userId || !supabase) {
    return mergeCapabilities(role, defaults)
  }

  try {
    const payload = await callEdgeFunction('capabilities', {
      allowAnonymous: false,
      query: { action: 'list' },
    })
    if (payload?.capabilities?.length) {
      return mergeCapabilities(role, payload.capabilities)
    }
  } catch {
    /* table may not exist yet */
  }

  try {
    const { data } = await supabase
      .from('user_capabilities')
      .select('capability')
      .eq('user_id', userId)

    if (data?.length) {
      return mergeCapabilities(role, data.map((r) => r.capability))
    }
  } catch {
    /* fallback */
  }

  return mergeCapabilities(role, defaults)
}

export async function grantCapability(capability, userId) {
  return callEdgeFunction('capabilities', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'grant', capability, user_id: userId },
  })
}
