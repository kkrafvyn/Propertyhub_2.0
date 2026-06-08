import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { normalizeSupabaseUser } from '../lib/auth'
import authService from '../services/auth-service'
import AuthShell from '../components/AuthShell'

export default function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [providerLoading, setProviderLoading] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = location.state?.from?.pathname || '/'
  const redirectState = location.state?.from?.bookingDraft
    ? { bookingDraft: location.state.from.bookingDraft }
    : undefined
  const bookingDraft = location.state?.from?.bookingDraft

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await authService.signIn(email, password)
      const user = normalizeSupabaseUser(data.user)

      localStorage.setItem('baytmiftah_user', JSON.stringify(user))
      setUser(user)
      navigate(redirectTarget, { replace: true, state: redirectState })
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSignIn = async (provider) => {
    setProviderLoading(provider)
    setError('')

    try {
      await authService.signInWithProvider(provider)
    } catch (err) {
      setError(
        err.message ||
          `Unable to continue with ${provider}. Check the Supabase OAuth provider settings.`
      )
      setProviderLoading('')
    }
  }

  return (
    <AuthShell
      headerLabel="Log in"
      title="Welcome back"
      subtitle="Use your BaytMiftah account or continue with a connected provider."
      footer={(
        <>
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            state={location.state}
            className="font-semibold text-[#9a7413] underline"
          >
            Request access
          </Link>
          <div className="mt-3 flex justify-center gap-3 text-xs">
            <Link to="#" className="hover:text-[#071121]">Privacy</Link>
            <span aria-hidden="true">.</span>
            <Link to="#" className="hover:text-[#071121]">Terms</Link>
            <span aria-hidden="true">.</span>
            <Link to="/concierge" className="hover:text-[#071121]">Concierge</Link>
          </div>
        </>
      )}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-[#b3261e]/30 bg-[#fff4f3] p-4">
              <p className="text-sm font-medium text-[#b3261e]">{error}</p>
            </div>
          )}
          {bookingDraft && (
            <div className="rounded-md border border-[#E9C349]/40 bg-[#fff7d6] p-4">
              <p className="text-sm font-semibold text-[#071121]">
                Sign in to schedule a viewing for {bookingDraft.property}.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white focus-within:border-[#e9c349]">
            <label htmlFor="email" className="block border-b border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Professional Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-0 bg-white px-4 py-2.5 text-base text-[#071121] outline-none placeholder:text-[#596170]"
              placeholder="name@firm.com"
              required
            />
            <label htmlFor="password" className="block border-y border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Access Key
            </label>
            <div className="flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 flex-1 border-0 bg-white px-4 py-2.5 text-base text-[#071121] outline-none placeholder:text-[#596170]"
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="flex h-12 w-12 items-center justify-center text-[#596170] hover:bg-[#f5f7fc]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <Link to="/reset-password" className="inline-block text-sm font-semibold text-[#9a7413] underline">
            Forgot Password?
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-md bg-[#e9c349] px-6 py-3 text-base font-semibold text-[#071121] transition hover:bg-[#d9b336] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-lg">settings</span>
                Signing in...
              </span>
            ) : (
              'Secure Login'
            )}
          </button>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#596170]">
            <span className="h-px flex-1 bg-[#cbd3df]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[#cbd3df]" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleProviderSignIn('google')}
              disabled={Boolean(providerLoading)}
              className="relative flex min-h-11 w-full items-center justify-center rounded-md border border-[#cbd3df] px-4 py-2.5 text-sm font-semibold text-[#071121] hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute left-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#4285F4] text-xs font-bold text-white">G</span>
              {providerLoading === 'google' ? 'Opening Google...' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => handleProviderSignIn('apple')}
              disabled={Boolean(providerLoading)}
              className="relative flex min-h-11 w-full items-center justify-center rounded-md border border-[#071121] bg-[#071121] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute left-4 text-lg font-bold">A</span>
              {providerLoading === 'apple' ? 'Opening Apple...' : 'Continue with Apple'}
            </button>
          </div>
        </form>
    </AuthShell>
  )
}
