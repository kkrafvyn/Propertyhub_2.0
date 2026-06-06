import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeSupabaseUser } from '../lib/auth'

export default function SignUp({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

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
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.name,
            name: formData.name,
            role: formData.role,
          },
        },
      })

      if (authError) throw authError

      if (data.session?.user || data.user) {
        const user = normalizeSupabaseUser(data.session?.user || data.user)
        localStorage.setItem('baytmiftah_user', JSON.stringify(user))
        setUser(user)
        navigate('/')
        return
      }

      setNotice('Account created. Check your email to confirm access before signing in.')
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.')
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
          <p className="text-on-surface-variant">Request Premium Access</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[#cbd3df] bg-white p-8 shadow-sm">
          {error && (
            <div className="p-4 bg-error/20 border border-error rounded-md">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}
          {notice && (
            <div className="rounded-md border border-secondary/30 bg-secondary/10 p-4">
              <p className="text-sm text-secondary">{notice}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-label-sm mb-2 text-on-surface">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-label-sm mb-2 text-on-surface">
              Professional Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-label-sm mb-2 text-on-surface">
              Account Type
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field"
            >
              <option value="buyer">Buyer / Investor</option>
              <option value="agent">Agent / Advisor</option>
              <option value="owner">Property Owner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-on-surface-variant">
            Already have access?{' '}
            <Link to="/login" className="text-secondary hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
