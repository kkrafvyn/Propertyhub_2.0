import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { userService } from '../../lib/user.service'
import { deriveConsumerCapabilities } from '../lib/baytmiftah/capabilities'
import { getUserRole } from '../lib/baytmiftah/roles'
import { consumerContextService } from '../../lib/consumer-context.service'
import { trackUserSession } from '../../lib/security/session-tracking'
import type { Database } from '../../lib/database.types'
import {
  getDesktopAPI,
  getDesktopOAuthRedirectUrl,
  isDesktopOAuthRuntime,
  consumeDesktopOAuthState,
  parseDesktopOAuthCallback,
  subscribeDesktopOAuthCallback,
} from '../../lib/desktop-oauth'
import {
  closeNativeOAuthBrowser,
  consumeNativeOAuthState,
  getNativeOAuthRedirectUrl,
  isNativeOAuthRuntime,
  openNativeOAuthUrl,
  subscribeNativeOAuthCallback,
  type NativeOAuthCallbackPayload,
} from '../../lib/native-oauth'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  role: string | null
  capabilities: string[]
  loading: boolean
  error: Error | null
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType?: "user" | "landlord",
  ) => Promise<{ user: User | null }>
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const role = useMemo(
    () => getUserRole(user as Parameters<typeof getUserRole>[0], profile as { role?: string } | null),
    [user, profile],
  )

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const checkAccess = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
      const { error: accessError } = await supabase.rpc('enforce_account_access');
      if (active && accessError?.code === '42501' && /Account access has been revoked/i.test(accessError.message)) {
        setUser(null); setProfile(null); setCapabilities([]);
        await supabase.auth.signOut({ scope: 'local' });
      }
      } catch { /* Retry on focus or the next interval after a network failure. */ }
    };
    void checkAccess();
    const timer = window.setInterval(() => void checkAccess(), 30_000);
    window.addEventListener('focus', checkAccess);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', checkAccess); };
  }, [user?.id]);

  useEffect(() => {
    const ensureProfile = async (currentUser: User | null) => {
      if (!currentUser?.email && !currentUser?.phone) {
        setProfile(null)
        return
      }

      try {
        const ensured = await userService.ensureUserProfile(
          currentUser.id,
          currentUser.email,
          currentUser.user_metadata?.full_name,
          currentUser.phone
        )
        setProfile(ensured)
        if (ensured?.banned) {
          await supabase.auth.signOut({ scope: "global" })
          setUser(null)
          setProfile(null)
        }
      } catch (profileError) {
        console.error('Failed to ensure user profile:', profileError)
        setProfile(null)
      }
    }

    // Restore the current session on mount. Never leave protected native routes
    // in a permanent loading state when secure storage is unavailable or stalls.
    const bootstrapAuth = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error('Timed out restoring the authentication session')), 8_000)
          }),
        ])
        const { data: { session }, error: authError } = sessionResult
        if (authError) {
          setUser(null)
          setProfile(null)
          setCapabilities([])
          return
        }
        const currentUser = session?.user ?? null
        setUser(currentUser)
        await ensureProfile(currentUser)
      } catch (authError) {
        console.warn('Unable to restore the current authentication session:', authError)
        setUser(null)
        setProfile(null)
        setCapabilities([])
      } finally {
        setLoading(false)
      }
    }

    void bootstrapAuth()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        await ensureProfile(nextUser)
        if (nextUser && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          void trackUserSession(nextUser.id)
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const unsubDesktop = subscribeDesktopOAuthCallback(async (payload) => {
      const callback = parseDesktopOAuthCallback(payload)
      if (!callback) return
      try {
        if (!consumeDesktopOAuthState(callback.state)) {
          throw new Error("Desktop OAuth state is missing, expired, mismatched, or already used")
        }
        const { error } = await supabase.auth.exchangeCodeForSession(callback.code)
        if (error) throw error
      } catch (callbackError) {
        console.error("Desktop OAuth callback failed:", callbackError)
        setError(callbackError instanceof Error ? callbackError : new Error("Desktop OAuth failed"))
      }
    })

    const unsubNative = subscribeNativeOAuthCallback(async (payload: NativeOAuthCallbackPayload) => {
      try {
        if (!consumeNativeOAuthState(payload.state)) {
          throw new Error("Native OAuth state is missing, expired, mismatched, or already used")
        }
        const { error } = await supabase.auth.exchangeCodeForSession(payload.code)
        if (error) throw error
        await closeNativeOAuthBrowser()
      } catch (callbackError) {
        console.error("Native OAuth callback failed:", callbackError)
        setError(
          callbackError instanceof Error
            ? callbackError
            : new Error("Native OAuth failed"),
        )
      }
    })

    return () => {
      unsubDesktop()
      unsubNative()
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setCapabilities([])
      return
    }

    let cancelled = false

    const loadCapabilities = async () => {
      try {
        const context = await consumerContextService.getConsumerContext(user.id)
        if (!cancelled) {
          setCapabilities(deriveConsumerCapabilities(context, role))
        }
      } catch (capabilityError) {
        console.error('Failed to load consumer capabilities:', capabilityError)
        if (!cancelled) {
          setCapabilities(
            deriveConsumerCapabilities(
              {
                hasBookingContext: false,
                hasRentingContext: false,
                hasBuyingContext: false,
              },
              role,
            ),
          )
        }
      }
    }

    void loadCapabilities()
    return () => {
      cancelled = true
    }
  }, [user?.id, role])

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType: "user" | "landlord" = "user",
  ) => {
    try {
      setError(null)
      const appRole = accountType === "landlord" ? "host" : "consumer"
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: appRole,
            account_type: accountType,
          },
        },
      })
      if (error) throw error

      if (data.session && data.user?.email) {
        await userService.ensureUserProfile(data.user.id, data.user.email, fullName)
      }
      return { user: data.user ?? null }
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

      if (isDesktopOAuthRuntime()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectTo || getDesktopOAuthRedirectUrl(),
            skipBrowserRedirect: true,
          },
        })
        if (error) throw error
        if (data?.url) {
          await getDesktopAPI()?.openExternal?.(data.url)
        }
        return
      }

      if (isNativeOAuthRuntime()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: getNativeOAuthRedirectUrl(),
            skipBrowserRedirect: true,
          },
        })
        if (error) throw error
        if (data?.url) {
          await openNativeOAuthUrl(data.url)
        }
        return
      }

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
      const { error } = await supabase.auth.signOut({ scope: "global" })
      if (error) throw error
      setUser(null)
      setProfile(null)
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
        profile,
        role,
        capabilities,
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

export const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  profile: null,
  role: null,
  capabilities: [],
  loading: false,
  error: null,
  signUp: async () => ({ user: null }),
  signIn: async () => {},
  signInWithPhoneOtp: async () => {},
  verifyPhoneOtp: async () => {},
  signInWithOAuth: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  return context ?? DEFAULT_AUTH_CONTEXT
}

export const useOptionalAuth = useAuth
