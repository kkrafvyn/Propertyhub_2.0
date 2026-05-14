import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { userService } from '../../lib/user.service'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithPhoneOtp: (phone: string) => Promise<void>
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>
  signInWithOAuth: (
    provider: 'google' | 'facebook' | 'apple',
    redirectTo?: string
  ) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string, redirectTo?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const ensureProfile = async (currentUser: User | null) => {
      if (!currentUser?.email && !currentUser?.phone) return

      try {
        await userService.ensureUserProfile(
          currentUser.id,
          currentUser.email,
          currentUser.user_metadata?.full_name,
          currentUser.phone
        )
      } catch (profileError) {
        console.error('Failed to ensure user profile:', profileError)
      }
    }

    // Check current user on mount
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      await ensureProfile(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        await ensureProfile(nextUser)
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

  const signInWithPhoneOtp = async (phone: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Phone sign in failed'))
      throw err
    }
  }

  const verifyPhoneOtp = async (phone: string, token: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })
      if (error) throw error

      if (data.user) {
        await userService.ensureUserProfile(
          data.user.id,
          data.user.email,
          data.user.user_metadata?.full_name,
          data.user.phone
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Phone verification failed'))
      throw err
    }
  }

  const signInWithOAuth = async (
    provider: 'google' | 'facebook' | 'apple',
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
        signUp,
        signIn,
        signInWithPhoneOtp,
        verifyPhoneOtp,
        signInWithOAuth,
        signOut,
        resetPassword,
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
