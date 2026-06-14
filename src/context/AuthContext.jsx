import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUserProfile } from '../lib/supabase-db'
import authService from '../services/auth-service'

import { getUserRole, getRoleHomePath } from '../lib/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const role = getUserRole(user, profile)
  const homePath = getRoleHomePath(user, profile)

  async function loadProfile(sessionUser) {
    if (!sessionUser) {
      setProfile(null)
      return
    }
    const row = await fetchUserProfile(sessionUser.id)
    setProfile(row)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      await loadProfile(sessionUser)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      await loadProfile(sessionUser)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      homePath,
      loading,
      signIn: authService.signInWithEmail,
      signUp: authService.signUpWithEmail,
      signInWithOAuth: authService.signInWithOAuth,
      resetPassword: authService.resetPasswordForEmail,
      signOut: async () => {
        await authService.signOut()
        setUser(null)
        setProfile(null)
      },
    }),
    [user, profile, role, homePath, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
