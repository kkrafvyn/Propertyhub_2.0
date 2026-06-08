import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { accountService } from '../services/production-service'
import AuthShell from '../components/AuthShell'
import AuthFormIcon from '../components/AuthFormIcon'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestReset = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const { error: resetError } = await accountService.requestPasswordReset(email)
    setLoading(false)
    if (resetError) setError(resetError.message)
    else setMessage('Reset link sent. Check your email for the secure link.')
  }

  const updatePassword = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const { error: updateError } = await accountService.updatePassword(password)
    setLoading(false)
    if (updateError) setError(updateError.message)
    else setMessage('Password updated. You can return to the workspace.')
  }

  return (
    <AuthShell
      headerLabel="Recover access"
      title="Reset your password"
      subtitle="Request a secure reset link, then return here from the Supabase recovery session to set a new password."
      backTo="/login"
      backIcon="arrow_back"
      highlights={[
        ['lock', 'Secure email recovery links'],
        ['verified', 'New password update flow'],
        ['calendar', 'Account security continues in profile settings'],
      ]}
      footer={(
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-[#9a7413] underline">
            Back to login
          </Link>
        </>
      )}
    >
      <div>
        {message && <p className="mt-5 rounded-md bg-[#fff7d6] p-3 text-sm font-semibold text-[#7a5a00]">{message}</p>}
        {error && <p className="mt-5 rounded-md bg-[#fff4f3] p-3 text-sm font-semibold text-[#b3261e]">{error}</p>}

        <form onSubmit={requestReset} className="mt-6 space-y-3">
          <label className="block text-xs font-semibold text-[#596170]" htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 w-full rounded-md border border-[#cbd3df] bg-white px-4 py-3 text-[#071121] outline-none placeholder:text-[#596170]"
            placeholder="name@firm.com"
            required
          />
          <button disabled={loading} className="min-h-11 w-full rounded-md bg-[#e9c349] px-5 py-3 font-semibold text-[#071121] disabled:opacity-60">
            Send reset link
          </button>
        </form>

        <form onSubmit={updatePassword} className="mt-8 space-y-3 border-t border-[#cbd3df] pt-6">
          <label className="block text-xs font-semibold text-[#596170]" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-md border border-[#cbd3df] bg-white px-4 py-3 text-[#071121] outline-none placeholder:text-[#596170]"
            placeholder="New password"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[#596170] hover:text-[#071121]"
          >
            <AuthFormIcon name={showPassword ? 'eye_off' : 'eye'} />
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
          <button disabled={loading} className="min-h-11 w-full rounded-md border border-[#071121] px-5 py-3 font-semibold text-[#071121] disabled:opacity-60">
            Update password
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
