import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { normalizeSupabaseUser } from '../lib/auth'
import { getRoleHomePath, SELF_SERVE_ROLES, USER_ROLES } from '../lib/roles'
import authService from '../services/auth-service'
import AuthShell from '../components/AuthShell'
import AuthFormIcon from '../components/AuthFormIcon'

const roleLabels = {
  [USER_ROLES.BUYER]: 'Buyer',
  [USER_ROLES.RENTER]: 'Renter / Tenant',
  [USER_ROLES.PROPERTY_OWNER]: 'Property Owner',
  [USER_ROLES.INDEPENDENT_AGENT]: 'Independent Agent',
  [USER_ROLES.PROPERTY_DEVELOPER]: 'Property Developer',
  [USER_ROLES.PROPERTY_MANAGER]: 'Property Management Company',
}

export default function SignUp({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: USER_ROLES.BUYER,
  })
  const [loading, setLoading] = useState(false)
  const [providerLoading, setProviderLoading] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = location.state?.from?.pathname
  const redirectState = location.state?.from?.bookingDraft
    ? { bookingDraft: location.state.from.bookingDraft }
    : undefined
  const bookingDraft = location.state?.from?.bookingDraft

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const data = await authService.signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' '),
        role: formData.role,
      })

      if (data.session?.user || data.user) {
        const user = normalizeSupabaseUser(data.session?.user || data.user)
        localStorage.setItem('baytmiftah_user', JSON.stringify(user))
        window.dispatchEvent(new Event('baytmiftah:user'))
        setUser(user)
        navigate(redirectTarget || getRoleHomePath(user.role), { replace: true, state: redirectState })
        return
      }

      setNotice('Account created. Check your email to confirm access before signing in.')
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSignUp = async (provider) => {
    setProviderLoading(provider)
    setError('')
    setNotice('')

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
      headerLabel="Unified access"
      title="Create your BaytMiftah account"
      subtitle="Start with one account. Your workspace and permissions adapt after sign-in and verification."
      backTo="/login"
      backIcon="arrow_back"
      footer={(
        <>
          Already have access?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-semibold text-[#9a7413] underline"
          >
            Sign in
          </Link>
        </>
      )}
      highlights={[
        ['person_add', 'One account for every role'],
        ['verified', 'Verification can continue inside the workspace'],
        ['groups', 'Agency teams can be invited after setup'],
      ]}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-[#b3261e]/30 bg-[#fff4f3] p-4">
              <p className="text-sm font-medium text-[#b3261e]">{error}</p>
            </div>
          )}
          {notice && (
            <div className="rounded-md border border-[#E9C349]/30 bg-[#fff7d6] p-4">
              <p className="text-sm font-medium text-[#E9C349]">{notice}</p>
            </div>
          )}
          {bookingDraft && (
            <div className="rounded-md border border-[#E9C349]/40 bg-[#fff7d6] p-4">
              <p className="text-sm font-semibold text-[#071121]">
                Create an account to request a viewing for {bookingDraft.property}.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white focus-within:border-[#e9c349]">
            <label htmlFor="name" className="block border-b border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border-0 bg-white px-4 py-2.5 text-base text-[#071121] outline-none placeholder:text-[#596170]"
              placeholder="Jane Cooper"
              required
            />
            <label htmlFor="email" className="block border-y border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Professional Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border-0 bg-white px-4 py-2.5 text-base text-[#071121] outline-none placeholder:text-[#596170]"
              placeholder="name@firm.com"
              required
            />
            <label htmlFor="password" className="block border-y border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Password
            </label>
            <div className="flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
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
                <AuthFormIcon name={showPassword ? 'eye_off' : 'eye'} />
              </button>
            </div>
            <label htmlFor="role" className="block border-y border-[#cbd3df] px-4 py-2 text-xs font-semibold text-[#596170]">
              Primary use
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border-0 bg-white px-4 py-2.5 text-base text-[#071121] outline-none"
            >
              {SELF_SERVE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs leading-5 text-[#596170]">
            By selecting Create Account, you agree to continue with identity and account verification for BaytMiftah.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-md bg-[#e9c349] px-6 py-3 text-base font-semibold text-[#071121] transition hover:bg-[#d9b336] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#596170]">
            <span className="h-px flex-1 bg-[#cbd3df]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[#cbd3df]" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleProviderSignUp('google')}
              disabled={Boolean(providerLoading)}
              className="relative flex min-h-11 w-full items-center justify-center rounded-md border border-[#cbd3df] px-4 py-2.5 text-sm font-semibold text-[#071121] hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
            <AuthFormIcon name="google" className="absolute left-4 text-[#4285F4]" />
              {providerLoading === 'google' ? 'Opening Google...' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => handleProviderSignUp('apple')}
              disabled={Boolean(providerLoading)}
              className="relative flex min-h-11 w-full items-center justify-center rounded-md border border-[#071121] bg-[#071121] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AuthFormIcon name="apple" className="absolute left-4 text-white" />
              {providerLoading === 'apple' ? 'Opening Apple...' : 'Continue with Apple'}
            </button>
          </div>

          <p className="text-xs leading-5 text-[#596170]">
            Social sign-up creates a secure account first; agency or owner verification can be completed inside the workspace.
          </p>

        </form>
    </AuthShell>
  )
}
