import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { upsertUserProfileFromAuth } from '../lib/supabase-db'

const OAUTH_NEXT_KEY = 'baytmiftah_oauth_next'
const OAUTH_META_KEY = 'baytmiftah_oauth_metadata'

async function withDirectAuthFallback(edgeCall, directCall) {
  try {
    return await edgeCall()
  } catch {
    if (!supabase) throw new Error('Authentication is unavailable.')
    return directCall()
  }
}

function getCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export function storeOAuthRedirect(redirectPath = '/', metadata = {}) {
  sessionStorage.setItem(OAUTH_NEXT_KEY, redirectPath)
  if (metadata && Object.keys(metadata).length) {
    sessionStorage.setItem(OAUTH_META_KEY, JSON.stringify(metadata))
  } else {
    sessionStorage.removeItem(OAUTH_META_KEY)
  }
}

export function consumeOAuthRedirect() {
  const next = sessionStorage.getItem(OAUTH_NEXT_KEY) || '/'
  const rawMeta = sessionStorage.getItem(OAUTH_META_KEY)
  sessionStorage.removeItem(OAUTH_NEXT_KEY)
  sessionStorage.removeItem(OAUTH_META_KEY)
  let metadata = {}
  if (rawMeta) {
    try {
      metadata = JSON.parse(rawMeta)
    } catch {
      metadata = {}
    }
  }
  return { next, metadata }
}

export async function signInWithOAuth(provider, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured. Check your .env file.')

  const { redirectPath = '/', metadata = {} } = options
  storeOAuthRedirect(redirectPath, metadata)

  const oauthOptions = { redirectTo: getCallbackUrl() }

  if (provider === 'google') {
    oauthOptions.queryParams = { access_type: 'offline', prompt: 'consent' }
  }

  if (provider === 'apple') {
    oauthOptions.scopes = 'email name'
  }

  if (Object.keys(metadata).length) {
    oauthOptions.data = metadata
  }

  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: oauthOptions })
  if (error) throw error
  return data
}

export async function completeOAuthCallback() {
  if (!supabase) throw new Error('Supabase is not configured.')

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const oauthError = params.get('error_description') || params.get('error')

  if (oauthError) throw new Error(oauthError)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session) throw new Error('Sign-in was cancelled or failed. Please try again.')

  const { next, metadata } = consumeOAuthRedirect()
  if (Object.keys(metadata).length) {
    await supabase.auth.updateUser({ data: metadata })
  }

  await upsertUserProfileFromAuth(session.user, metadata)

  return { session, next }
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
      if (data.user) await upsertUserProfileFromAuth(data.user, metadata)
      return { user: data.user, session: data.session }
    },
  )
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

export async function resetPasswordForEmail(email) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const redirectTo = `${window.location.origin}/login`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export default {
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  completeOAuthCallback,
  signOut,
  resetPasswordForEmail,
}
