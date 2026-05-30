import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { userService } from '../../lib/user.service'

type AuthAssuranceLevel = string | null

export interface AuthAssuranceState {
  currentLevel: AuthAssuranceLevel
  nextLevel: AuthAssuranceLevel
  loading: boolean
}

export interface AuthMfaFactor {
  id: string
  factor_type: 'totp' | 'phone' | 'webauthn' | (string & {})
  friendly_name?: string
  status: 'verified' | 'unverified' | (string & {})
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  authAssurance: AuthAssuranceState
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (
    provider: 'google' | 'apple',
    redirectTo?: string
  ) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string, redirectTo?: string) => Promise<void>
  refreshAuthAssurance: () => Promise<{ currentLevel: AuthAssuranceLevel; nextLevel: AuthAssuranceLevel }>
  listMfaFactors: () => Promise<AuthMfaFactor[]>
  challengeMfaFactor: (
    factor: AuthMfaFactor,
    options?: { channel?: 'sms' | 'whatsapp' }
  ) => Promise<string>
  verifyMfaFactor: (factorId: string, challengeId: string, code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const EMPTY_AUTH_ASSURANCE: AuthAssuranceState = {
  currentLevel: null,
  nextLevel: null,
  loading: false,
}

function getAuthProfileName(currentUser: User | null, fallback?: string) {
  return (
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.preferred_username ||
    fallback
  )
}

function clearAuthUrlFragment() {
  if (typeof window === 'undefined') return

  const hash = window.location.hash || ''
  const containsAuthTokens =
    hash.includes('access_token=') ||
    hash.includes('refresh_token=') ||
    hash.includes('provider_token=')

  if (!containsAuthTokens) return

  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${window.location.search}`
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [authAssurance, setAuthAssurance] = useState<AuthAssuranceState>({
    ...EMPTY_AUTH_ASSURANCE,
    loading: true,
  })

  useEffect(() => {
    const authOverride =
      typeof window !== 'undefined'
        ? (window as Window & {
            __BAYTMIFTAH_AUTH_OVERRIDE__?: {
              user?: User | null
              authAssurance?: {
                currentLevel?: AuthAssuranceLevel
                nextLevel?: AuthAssuranceLevel
              }
            } | null
          }).__BAYTMIFTAH_AUTH_OVERRIDE__
        : undefined

    if (authOverride) {
      setUser(authOverride.user ?? null)
      setAuthAssurance({
        currentLevel: authOverride.authAssurance?.currentLevel ?? null,
        nextLevel: authOverride.authAssurance?.nextLevel ?? null,
        loading: false,
      })
      setLoading(false)
      return
    }

    const ensureProfile = async (currentUser: User | null) => {
      if (!currentUser?.email && !currentUser?.phone) return

      try {
        await userService.ensureUserProfile(
          currentUser.id,
          currentUser.email,
          getAuthProfileName(currentUser),
          currentUser.phone
        )
      } catch (profileError) {
        console.error('Failed to ensure user profile:', profileError)
      }
    }

    const syncAuthAssurance = async (currentUser: User | null) => {
      if (!currentUser) {
        setAuthAssurance(EMPTY_AUTH_ASSURANCE)
        return
      }

      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (error) throw error

        setAuthAssurance({
          currentLevel: data?.currentLevel ?? null,
          nextLevel: data?.nextLevel ?? null,
          loading: false,
        })
      } catch (assuranceError) {
        console.error('Failed to load authenticator assurance level:', assuranceError)
        setAuthAssurance(EMPTY_AUTH_ASSURANCE)
      }
    }

    // Check current user on mount
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) clearAuthUrlFragment()
      await ensureProfile(user)
      await syncAuthAssurance(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) clearAuthUrlFragment()
        await ensureProfile(nextUser)
        await syncAuthAssurance(nextUser)
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (error) throw error

      if (data.session && data.user?.email) {
        await userService.ensureUserProfile(data.user.id, data.user.email, fullName)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign up failed'))
      throw err
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign in failed'))
      throw err
    }
  }

  const refreshAuthAssurance = async () => {
    try {
      setError(null)
      setAuthAssurance((current) => ({ ...current, loading: true }))
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!currentUser) {
        setAuthAssurance(EMPTY_AUTH_ASSURANCE)
        return {
          currentLevel: null,
          nextLevel: null,
        }
      }

      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error

      const nextAssurance = {
        currentLevel: data?.currentLevel ?? null,
        nextLevel: data?.nextLevel ?? null,
      }
      setAuthAssurance({
        ...nextAssurance,
        loading: false,
      })
      return nextAssurance
    } catch (err) {
      setAuthAssurance(EMPTY_AUTH_ASSURANCE)
      setError(err instanceof Error ? err : new Error('Failed to refresh authenticator assurance'))
      throw err
    }
  }

  const listMfaFactors = async () => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error

      return [...(data?.totp || []), ...(data?.phone || []), ...(data?.webauthn || [])]
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load MFA factors'))
      throw err
    }
  }

  const challengeMfaFactor = async (
    factor: AuthMfaFactor,
    options?: { channel?: 'sms' | 'whatsapp' }
  ) => {
    try {
      setError(null)
      const challengeParams =
        factor.factor_type === 'phone'
          ? {
              factorId: factor.id,
              channel: options?.channel || 'sms',
            }
          : {
              factorId: factor.id,
            }

      const { data, error } = await supabase.auth.mfa.challenge(challengeParams)
      if (error) throw error

      return data.id
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create MFA challenge'))
      throw err
    }
  }

  const verifyMfaFactor = async (factorId: string, challengeId: string, code: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })
      if (error) throw error

      await refreshAuthAssurance()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to verify MFA code'))
      throw err
    }
  }

  const signInWithOAuth = async (
    provider: 'google' | 'apple',
    redirectTo?: string
  ) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err : new Error('OAuth sign in failed'))
      throw err
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setAuthAssurance(EMPTY_AUTH_ASSURANCE)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign out failed'))
      throw err
    }
  }

  const resetPassword = async (email: string, redirectTo?: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      )
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Reset failed'))
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        authAssurance,
        signUp,
        signIn,
        signInWithOAuth,
        signOut,
        resetPassword,
        refreshAuthAssurance,
        listMfaFactors,
        challengeMfaFactor,
        verifyMfaFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
