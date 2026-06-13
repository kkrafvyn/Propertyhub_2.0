import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'

async function withDirectAuthFallback(edgeCall, directCall) {
  try {
    return await edgeCall()
  } catch {
    if (!supabase) throw new Error('Authentication is unavailable.')
    return directCall()
  }
}

export async function getCurrentUser() {
  return withDirectAuthFallback(
    () => callEdgeFunction('auth', { allowAnonymous: false, query: { action: 'me' } }),
    async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user: data.user }
    },
  )
}

export async function signInWithEmail(email, password) {
  return withDirectAuthFallback(
    async () => {
      const payload = await callEdgeFunction('auth', {
        method: 'POST',
        allowAnonymous: true,
        body: { action: 'login', email, password },
      })
      if (payload?.session) await supabase.auth.setSession(payload.session)
      return payload
    },
    async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { user: data.user, session: data.session }
    },
  )
}

export async function signUpWithEmail(email, password, metadata = {}) {
  return withDirectAuthFallback(
    async () => {
      const payload = await callEdgeFunction('auth', {
        method: 'POST',
        allowAnonymous: true,
        body: { action: 'signup', email, password, metadata },
      })
      if (payload?.session) await supabase.auth.setSession(payload.session)
      return payload
    },
    async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })
      if (error) throw error
      return { user: data.user, session: data.session }
    },
  )
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

export default { getCurrentUser, signInWithEmail, signUpWithEmail, signOut }
