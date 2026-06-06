import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeSupabaseUser } from '../lib/auth'

export default function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const user = normalizeSupabaseUser(data.user)

      localStorage.setItem('baytmiftah_user', JSON.stringify(user))
      setUser(user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="mb-2 text-4xl font-black text-[#071121]">Property Hub</h1>
          <p className="text-on-surface-variant">Institutional Access Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[#cbd3df] bg-white p-8 shadow-sm">
          {error && (
            <div className="p-4 bg-error/20 border border-error rounded-md">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-label-sm mb-2 text-on-surface">
              Professional Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="name@firm.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-label-sm mb-2 text-on-surface">
              Access Key
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
            <Link to="#" className="text-secondary text-sm mt-1 inline-block hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin material-symbols-outlined text-lg">settings</span>
                Signing in...
              </span>
            ) : (
              'Secure Login'
            )}
          </button>

          <div className="text-center text-sm">
            <p className="text-on-surface-variant mb-2">
              Or sign in with:
            </p>
            <div className="flex gap-3">
              <button type="button" className="flex-1 btn-secondary">
                <span className="material-symbols-outlined">security</span>
              </button>
              <button type="button" className="flex-1 btn-secondary">
                <span className="material-symbols-outlined">fingerprint</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer Links */}
        <div className="text-center mt-8 space-y-2 text-sm text-on-surface-variant">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="text-secondary hover:underline">
              Request Access
            </Link>
          </p>
          <p>
            <Link to="#" className="text-secondary hover:underline">
              Global Access
            </Link>
            {' '}•{' '}
            <Link to="#" className="text-secondary hover:underline">
              Privacy
            </Link>
            {' '}•{' '}
            <Link to="#" className="text-secondary hover:underline">
              Concierge
            </Link>
          </p>
          <p className="text-xs mt-4">
            © 2024 Property Hub Real Estate Ecosystem. Secure encrypted session.
          </p>
        </div>
      </div>
    </div>
  )
}
