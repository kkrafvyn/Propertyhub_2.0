import { supabase } from '../lib/supabase'
import { callEdgeFunction } from './edge-client'

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

  async getCurrentUser() {
    return callEdgeFunction('auth', {
      method: 'POST',
      query: { action: 'me' },
      body: {},
    })
  },
}

export default authService
