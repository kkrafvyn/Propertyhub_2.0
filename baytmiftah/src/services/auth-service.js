import { supabase } from '../lib/supabase'
import { callEdgeFunction } from './edge-client'

const oauthRedirectTo = () => {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/`
}

export const authService = {
  async signIn(email, password) {
    const data = await callEdgeFunction('auth', {
      method: 'POST',
      allowAnonymous: true,
      query: { action: 'login' },
      body: { email, password },
    })

    if (data?.session?.access_token && data?.session?.refresh_token) {
      await supabase.auth.setSession(data.session)
    }

    return data
  },

  async signUp(payload) {
    const data = await callEdgeFunction('auth', {
      method: 'POST',
      allowAnonymous: true,
      query: { action: 'signup' },
      body: payload,
    })

    if (data?.session?.access_token && data?.session?.refresh_token) {
      await supabase.auth.setSession(data.session)
    }

    return data
  },

  async signInWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirectTo(),
        queryParams:
          provider === 'google'
            ? {
                access_type: 'offline',
                prompt: 'consent',
              }
            : undefined,
      },
    })

    if (error) throw error
    return data
  },

  async getCurrentUser() {
    return callEdgeFunction('auth', {
      method: 'POST',
      query: { action: 'me' },
      body: {},
    })
  },
}

export default authService
