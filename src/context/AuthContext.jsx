import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUserProfile } from '../lib/supabase-db'
import { mergeSavedOnLogin } from '../lib/saved-listings'
import { identifyUser } from '../lib/analytics'
import authService from '../services/auth-service'
import { fetchUserCapabilities } from '../services/capability-service'

import { getUserRole, getRoleHomePath } from '../lib/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [capabilities, setCapabilities] = useState([])
  const [loading, setLoading] = useState(true)

  const role = getUserRole(user, profile)
  const homePath = getRoleHomePath(user, profile)

  async function loadProfile(sessionUser, event) {
    if (!sessionUser) {
      setProfile(null)
      setCapabilities([])
      return
    }
    const row = await fetchUserProfile(sessionUser.id)
    setProfile(row)
  const caps = await fetchUserCapabilities(sessionUser.id, row?.role ?? 'consumer')
    setCapabilities(caps)
    if (event === 'SIGNED_IN') {
      mergeSavedOnLogin().catch(() => {})
      identifyUser(sessionUser.id, { email: sessionUser.email, role: row?.role })
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      await loadProfile(sessionUser, sessionUser ? 'SIGNED_IN' : null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      await loadProfile(sessionUser, event)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      homePath,
      capabilities,
      loading,
      signIn: authService.signInWithEmail,
      signUp: authService.signUpWithEmail,
      signInWithOAuth: authService.signInWithOAuth,
      resetPassword: authService.resetPasswordForEmail,
      signOut: async () => {
        await authService.signOut()
        setUser(null)
        setProfile(null)
        setCapabilities([])
      },
    }),
    [user, profile, role, homePath, loading, capabilities],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
